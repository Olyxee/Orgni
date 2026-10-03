import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { accounts, emailVerifications, members, organisations, passwordResets } from "@workspace/db/schema";

/**
 * In-memory stand-in for the four tables the auth routes touch. `where` is
 * honoured by matching the column name, so a test cannot accidentally pass by
 * returning every row.
 */
const state = vi.hoisted(() => ({
  accounts: new Map<string, any>(),
  orgs: new Map<string, any>(),
  members: new Map<string, any>(),
  resets: new Map<string, any>(),
  verifications: new Map<string, any>(),
  failure: false,
  /** Flipped per test to exercise the verification gate. */
  verification: false,
  mail: [] as { to: string; resetUrl: string }[],
  verifyMail: [] as { to: string; verifyUrl: string }[],
}));

vi.mock("../src/lib/config", () => ({
  config: { DATABASE_URL: "test", NODE_ENV: "production", APP_BASE_URL: "https://app.test" },
  authSecret: "test-secret",
}));
vi.mock("../src/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), debug: vi.fn() },
}));
vi.mock("../src/lib/email", () => ({
  emailConfigured: () => state.verification,
  sendPasswordReset: vi.fn(async ({ to, resetUrl }: { to: string; resetUrl: string }) => {
    state.mail.push({ to, resetUrl });
    return true;
  }),
  sendVerificationEmail: vi.fn(
    async ({ to, verifyUrl }: { to: string; verifyUrl: string }) => {
      state.verifyMail.push({ to, verifyUrl });
      return true;
    },
  ),
}));
vi.mock("@workspace/db/connect", () => ({ createDb: () => ({ db: makeDb() }) }));

/** Drizzle column name -> row key, so `eq()` clauses can be evaluated. */
const COLUMN_KEYS: Record<string, string> = {
  email: "email",
  tenant_id: "tenantId",
  token_hash: "tokenHash",
  expires_at: "expiresAt",
  password_hash: "passwordHash",
};

/**
 * Read a drizzle `eq(column, value)` clause. It compiles to
 * `[StringChunk, Column, StringChunk, Param, StringChunk]`, so the column is
 * the chunk carrying a name and the bound value is the `Param`. `StringChunk`
 * also has a `value`, so it is told apart by the Param-only `encoder` field.
 */
function whereClause(condition: any): { column: string; value: unknown } | null {
  const chunks = condition?.queryChunks;
  if (!Array.isArray(chunks)) return null;
  let column: string | undefined;
  let value: unknown;
  let found = false;
  for (const chunk of chunks) {
    if (typeof chunk?.name === "string" && column === undefined) {
      column = chunk.name;
    } else if (chunk && typeof chunk === "object" && "encoder" in chunk) {
      value = (chunk as { value: unknown }).value;
      found = true;
    }
  }
  if (column === undefined || !found) return null;
  return { column: COLUMN_KEYS[column] ?? column, value };
}

function tableFor(table: unknown) {
  if (table === accounts) return { rows: state.accounts, key: "email" };
  if (table === organisations) return { rows: state.orgs, key: "tenantId" };
  if (table === members) return { rows: state.members, key: null };
  if (table === passwordResets) return { rows: state.resets, key: "tokenHash" };
  if (table === emailVerifications) return { rows: state.verifications, key: "tokenHash" };
  throw new Error("unexpected table in auth route");
}

function makeDb() {
  const guard = () => {
    if (state.failure) throw new Error("database unavailable");
  };
  /** Never silently match everything: an unreadable clause is a broken test. */
  const match = (condition: any, row: any) => {
    const clause = whereClause(condition);
    if (!clause) throw new Error("fake db received an unsupported where clause");
    return row[clause.column] === clause.value;
  };
  return {
    async transaction(fn: any) {
      const snapshot = ["accounts", "orgs", "members", "resets", "verifications"].map((name) => [
        name,
        new Map((state as any)[name]),
      ]) as [string, Map<string, any>][];
      try {
        return await fn(api());
      } catch (error) {
        for (const [name, rows] of snapshot) (state as any)[name] = rows;
        throw error;
      }
    },
    select: () => ({ from: (table: unknown) => ({ where: async (condition: any) => {
      guard();
      return [...tableFor(table).rows.values()].filter((row) => match(condition, row));
    } }) }),
  };

  function api() {
    return {
      insert: (table: unknown) => ({ values: async (value: any) => {
        guard();
        const { rows, key } = tableFor(table);
        if (key) {
          if (rows.has(value[key])) {
            const error: any = new Error("duplicate key");
            error.code = "23505";
            throw error;
          }
          rows.set(value[key], value);
          return;
        }
        rows.set(`${value.tenantId}|${value.email}`, value);
      } }),
      update: (table: unknown) => ({
        set: (changes: any) => ({ where: async (condition: any) => {
          guard();
          for (const row of tableFor(table).rows.values()) {
            if (match(condition, row)) Object.assign(row, changes);
          }
        } }),
      }),
      delete: (table: unknown) => ({ where: async (condition: any) => {
        guard();
        const { rows } = tableFor(table);
        for (const [id, row] of rows) {
          if (match(condition, row)) rows.delete(id);
        }
      } }),
    };
  }
}

import router from "../src/routes/auth";
import { verifyToken } from "../src/lib/auth";
import { hashPassword, verifyPassword } from "../src/lib/passwords";

let server: Server;
let base: string;
let client = 0;

async function post(action: string, body: unknown, from = ++client) {
  const response = await fetch(`${base}/auth/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${from}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

const input = {
  email: " Owner@Example.com ",
  organization: "Acme",
  password: "a long secret passphrase",
  confirmPassword: "a long secret passphrase",
};

/** The token the mocked email seam would have delivered. */
function emailedToken(): string {
  const mail = state.mail.at(-1);
  return new URL(mail!.resetUrl).searchParams.get("token")!;
}

beforeAll(async () => {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  client++;
  state.accounts.clear();
  state.orgs.clear();
  state.members.clear();
  state.resets.clear();
  state.verifications.clear();
  state.verification = false;
  state.failure = false;
  state.mail.length = 0;
  state.verifyMail.length = 0;
});

describe("credential registration and sign in", () => {
  it("validates email, organization, password length and confirmation", async () => {
    for (const [patch, error] of [
      [{ email: 123 }, "invalid_email"],
      [{ organization: " " }, "invalid_organization"],
      [{ password: "short" }, "invalid_password"],
      [{ password: "x".repeat(129) }, "invalid_password"],
      [{ confirmPassword: "different" }, "password_mismatch"],
    ] as const) {
      const result = await post("register", { ...input, ...patch });
      expect(result.status).toBe(400);
      expect(result.body.error).toBe(error);
    }
    expect(state.accounts.size).toBe(0);
  });

  it("persists only a hash, issues a session and supports subsequent sign in", async () => {
    const created = await post("register", input);
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe("no-store");
    expect(created.body.principal.email).toBe("owner@example.com");
    expect(verifyToken(created.body.token, "test-secret")?.tenantId).toBe(created.body.principal.tenantId);

    const account = state.accounts.get("owner@example.com");
    expect(account.passwordHash).not.toContain(input.password);
    expect(await verifyPassword(input.password, account.passwordHash)).toBe(true);

    const login = await post("login", { email: input.email, password: input.password });
    expect(login.status).toBe(200);
    expect(login.body.principal).toEqual(created.body.principal);
    expect((await post("login", { email: input.email, password: "wrong" })).status).toBe(401);
    expect((await post("login", { email: input.email, organization: input.organization })).status).toBe(400);
  });

  it("provisions the registrant as the first active owner of the workspace", async () => {
    const created = await post("register", input);
    const owner = state.members.get(`${created.body.principal.tenantId}|owner@example.com`);
    expect(owner).toMatchObject({ email: "owner@example.com", role: "owner", status: "active" });
  });

  it("rejects case-insensitive duplicate accounts without leaving an extra organization", async () => {
    expect((await post("register", input)).status).toBe(201);
    const duplicate = await post("register", { ...input, email: "OWNER@EXAMPLE.COM" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("account_exists");
    expect(state.orgs.size).toBe(1);
  });

  it("allocates isolated tenants for identical organization names", async () => {
    const first = await post("register", input);
    const second = await post("register", { ...input, email: "other@example.com" });
    expect(second.status).toBe(201);
    expect(second.body.principal.tenantId).not.toBe(first.body.principal.tenantId);
  });

  it("does not issue sessions when persistence fails", async () => {
    state.failure = true;
    const result = await post("register", input);
    expect(result.status).toBe(503);
    expect(result.body.token).toBeUndefined();
  });

  it("does not leave a member row behind when the account insert conflicts", async () => {
    await post("register", input);
    await post("register", { ...input, email: "second@example.com" });
    const before = state.members.size;
    expect((await post("register", { ...input, organization: "Other" })).status).toBe(409);
    expect(state.members.size).toBe(before);
  });

  it("rejects unknown accounts with the same credential error", async () => {
    const result = await post("login", { email: "unknown@example.com", password: input.password });
    expect(result.status).toBe(401);
    expect(result.body.error).toBe("invalid_credentials");
  });
});

describe("password recovery", () => {
  it("emails a reset link and lets the new password sign in", async () => {
    const created = await post("register", input);
    const requested = await post("password-reset/request", { email: input.email });
    expect(requested.status).toBe(202);
    expect(state.mail).toHaveLength(1);
    expect(state.mail[0].to).toBe("owner@example.com");
    expect(state.mail[0].resetUrl).toContain("https://app.test/reset-password?token=");

    // Only the digest is stored, so a database copy cannot be replayed.
    const stored = [...state.resets.values()][0];
    expect(stored.tokenHash).not.toBe(emailedToken());
    expect(stored.tokenHash).toHaveLength(64);

    const confirmed = await post("password-reset/confirm", { token: emailedToken(), password: "an even longer passphrase" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.principal).toEqual(created.body.principal);
    expect(await post("login", { email: input.email, password: "an even longer passphrase" })).toMatchObject({ status: 200 });
    expect((await post("login", { email: input.email, password: input.password })).status).toBe(401);
  });

  it("accepts a reset token only once", async () => {
    await post("register", input);
    await post("password-reset/request", { email: input.email });
    const token = emailedToken();
    expect((await post("password-reset/confirm", { token, password: "first new passphrase" })).status).toBe(200);
    const replay = await post("password-reset/confirm", { token, password: "second new passphrase" });
    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe("invalid_token");
    expect(state.resets.size).toBe(0);
  });

  it("replaces an outstanding link when a new one is requested", async () => {
    await post("register", input);
    await post("password-reset/request", { email: input.email });
    const stale = emailedToken();
    await post("password-reset/request", { email: input.email });
    expect(state.resets.size).toBe(1);
    expect((await post("password-reset/confirm", { token: stale, password: "a fresh passphrase here" })).status).toBe(400);
  });

  it("rejects an expired link", async () => {
    await post("register", input);
    await post("password-reset/request", { email: input.email });
    const [row] = state.resets.values();
    row.expiresAt = new Date(Date.now() - 1000);
    const result = await post("password-reset/confirm", { token: emailedToken(), password: "a fresh passphrase here" });
    expect(result.status).toBe(400);
    expect(result.body.error).toBe("invalid_token");
  });

  it("validates the new password before spending the token", async () => {
    await post("register", input);
    await post("password-reset/request", { email: input.email });
    const token = emailedToken();
    const short = await post("password-reset/confirm", { token, password: "short" });
    expect(short.status).toBe(400);
    expect(short.body.error).toBe("invalid_password");
    expect(state.resets.size).toBe(1);
    expect((await post("password-reset/confirm", { token: "deadbeef", password: "a fresh passphrase here" })).body.error).toBe("invalid_token");
  });

  it("answers identically for unknown and malformed addresses", async () => {
    await post("register", input);
    const known = await post("password-reset/request", { email: input.email });
    const unknown = await post("password-reset/request", { email: "nobody@example.com" });
    const malformed = await post("password-reset/request", { email: "not-an-email" });
    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    expect(malformed.status).toBe(202);
    expect(malformed.body).toEqual(known.body);
    // Only the registered address was actually mailed.
    expect(state.mail.map((m) => m.to)).toEqual(["owner@example.com"]);
  });

  it("still accepts a request when the database is down, without leaking that fact", async () => {
    state.failure = true;
    const result = await post("password-reset/request", { email: input.email });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({ accepted: true });
  });
});

describe("email verification", () => {
  // Turn the gate on for this block only; beforeEach resets it.
  beforeEach(() => {
    state.verification = true;
  });

  it("issues no session until the address is confirmed", async () => {
    const created = await post("register", input);
    expect(created.status).toBe(202);
    expect(created.body).toEqual({ pendingVerification: true, email: "owner@example.com" });
    expect(created.body.token).toBeUndefined();

    // The workspace exists but cannot be reached without a session.
    expect(state.accounts.get("owner@example.com").emailVerifiedAt).toBeNull();
    expect(state.verifyMail).toHaveLength(1);
    expect(state.verifications.size).toBe(1);
  });

  it("refuses sign-in with the right password until confirmed", async () => {
    await post("register", input);
    const login = await post("login", { email: input.email, password: input.password });
    expect(login.status).toBe(403);
    expect(login.body.error).toBe("email_unverified");
  });

  it("confirms, returns a session, and admits sign-in afterwards", async () => {
    await post("register", input);
    const token = new URL(state.verifyMail[0].verifyUrl).searchParams.get("token")!;
    const confirmed = await post("verify-email", { token });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.principal.email).toBe("owner@example.com");

    expect(state.accounts.get("owner@example.com").emailVerifiedAt).toBeInstanceOf(Date);
    // Token spent, so the link cannot be replayed.
    expect(state.verifications.size).toBe(0);
    expect((await post("login", { email: input.email, password: input.password })).status).toBe(200);
    expect((await post("verify-email", { token })).status).toBe(400);
  });

  it("stores only a digest of the verification token", async () => {
    await post("register", input);
    const token = new URL(state.verifyMail[0].verifyUrl).searchParams.get("token")!;
    const [row] = state.verifications.values();
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toHaveLength(64);
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("honours the 24 hour window", async () => {
    await post("register", input);
    const [row] = state.verifications.values();
    row.expiresAt = new Date(Date.now() - 1000);
    const result = await post("verify-email", { token: new URL(state.verifyMail[0].verifyUrl).searchParams.get("token")! });
    expect(result.status).toBe(400);
    expect(result.body.error).toBe("invalid_token");
  });

  it("resends for an unconfirmed address and stays silent about the rest", async () => {
    await post("register", input);
    const known = await post("verify-email/resend", { email: input.email });
    const unknown = await post("verify-email/resend", { email: "nobody@example.com" });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    // Only the genuinely unverified account gets another link.
    expect(state.verifyMail).toHaveLength(2);
    expect(state.verifyMail.every((m) => m.to === "owner@example.com")).toBe(true);
  });

  it("does not resend to an already confirmed address", async () => {
    await post("register", input);
    await post("verify-email", { token: new URL(state.verifyMail[0].verifyUrl).searchParams.get("token")! });
    state.verifyMail.length = 0;
    const resend = await post("verify-email/resend", { email: input.email });
    expect(resend.status).toBe(202);
    expect(state.verifyMail).toHaveLength(0);
  });

  it("replaces an outstanding link when a new one is requested", async () => {
    await post("register", input);
    const stale = new URL(state.verifyMail[0].verifyUrl).searchParams.get("token")!;
    await post("verify-email/resend", { email: input.email });
    expect(state.verifications.size).toBe(1);
    expect((await post("verify-email", { token: stale })).status).toBe(400);
  });

  it("skips verification entirely when email is not configured", async () => {
    state.verification = false;
    const created = await post("register", input);
    expect(created.status).toBe(201);
    expect(created.body.token).toBeTruthy();
    expect(state.verifyMail).toHaveLength(0);
    expect((await post("login", { email: input.email, password: input.password })).status).toBe(200);
  });
});

describe("throttling", () => {
  // scrypt at N=32768 costs ~250ms per verification, so these need real budget.
  it("does not throttle successful sign-ins", async () => {
    await post("register", input);
    const from = 900;
    for (let i = 0; i < 25; i++) {
      const result = await post("login", { email: input.email, password: input.password }, from);
      expect(result.status).toBe(200);
    }
  }, 60_000);

  it("throttles repeated credential failures and recovers after a success", async () => {
    const from = 901;
    await post("register", input);
    for (let i = 0; i < 20; i++) {
      expect((await post("login", { email: input.email, password: "wrong" }, from)).status).toBe(401);
    }
    const blocked = await post("login", { email: input.email, password: input.password }, from);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("too_many_attempts");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);

    // A different address is unaffected: budgets are per client, not global.
    expect((await post("login", { email: input.email, password: "wrong" }, 902)).status).toBe(401);
  }, 60_000);

  it("charges sign-up only once it succeeds, so mistyped input is never punished", async () => {
    const from = 903;
    for (let i = 0; i < 30; i++) {
      expect((await post("register", { ...input, password: "short" }, from)).status).toBe(400);
    }
    for (let i = 0; i < 10; i++) {
      const result = await post("register", { ...input, email: `owner${i}@example.com` }, from);
      expect(result.status).toBe(201);
    }
    expect((await post("register", { ...input, email: "last@example.com" }, from)).status).toBe(429);
  }, 60_000);
});

describe("password hashing", () => {
  it("salts identical passwords differently and rejects malformed hashes", async () => {
    expect(await hashPassword(input.password)).not.toBe(await hashPassword(input.password));
    expect(await verifyPassword(input.password, "broken")).toBe(false);
  });
});
