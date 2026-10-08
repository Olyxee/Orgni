/**
 * End-to-end credential tests against a real Postgres.
 *
 * The unit suite in registration.test.ts fakes the database, which cannot
 * prove the things that only exist in Postgres: that the migrations produce
 * the constraints the code relies on, and that a duplicate email really
 * surfaces as SQLSTATE 23505. This covers those.
 *
 * Opt in by pointing TEST_DATABASE_URL at a throwaway database and running:
 *   TEST_DATABASE_URL=postgres://... pnpm vitest run tests/auth-postgres.test.ts
 * The database is migrated by the caller; these tests only add and read rows.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import { sql } from "drizzle-orm";
import type { Server } from "node:http";
import { createDb } from "@workspace/db/connect";
import {
  accounts,
  emailVerifications,
  members,
  organisations,
  passwordResets,
} from "@workspace/db/schema";

const url = process.env.TEST_DATABASE_URL;
const describeLive = url ? describe : describe.skip;

if (!url) {
  // config.ts validates DATABASE_URL at import, so a skipped run must not boot it.
  process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
}

const mail: { to: string; resetUrl: string }[] = [];
const verificationMail: { to: string; verifyUrl: string }[] = [];
let requireVerification = false;
vi.mock("../src/lib/email", () => ({
  emailConfigured: () => requireVerification,
  sendMemberInvite: vi.fn(async () => true),
  sendPasswordReset: vi.fn(async ({ to, resetUrl }: { to: string; resetUrl: string }) => {
    mail.push({ to, resetUrl });
    return true;
  }),
  sendVerificationEmail: vi.fn(async ({ to, verifyUrl }: { to: string; verifyUrl: string }) => {
    verificationMail.push({ to, verifyUrl });
    return true;
  }),
}));

const { default: router } = await import("../src/routes/auth");

let server: Server;
let base: string;
let db: ReturnType<typeof createDb>;
let client = 0;

async function post(action: string, body: unknown) {
  const response = await fetch(`${base}/auth/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${++client}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const input = {
  email: "Owner@Example.com",
  organization: "Acme",
  password: "a long secret passphrase",
  confirmPassword: "a long secret passphrase",
};

async function clear() {
  await db.db.transaction(async (tx) => {
    await tx.delete(passwordResets);
    await tx.delete(emailVerifications);
    await tx.delete(accounts);
    await tx.delete(members);
    await tx.delete(organisations);
  });
  mail.length = 0;
  verificationMail.length = 0;
  requireVerification = false;
}

describeLive("credential auth against Postgres", () => {
  beforeAll(async () => {
    db = createDb(url!);
    await clear();
    const app = express();
    app.set("trust proxy", true);
    app.use(express.json(), router);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (db) await clear();
  });

  afterEach(clear);

  it("registers an account, tenant and owner member", async () => {
    const created = await post("register", input);
    expect(created.status).toBe(201);
    expect(created.body.principal.email).toBe("owner@example.com");

    const [account] = await db.db.select().from(accounts);
    const [org] = await db.db.select().from(organisations);
    const [member] = await db.db.select().from(members);
    expect(account.email).toBe("owner@example.com");
    expect(account.tenantId).toBe(org.tenantId);
    expect(member).toMatchObject({ email: "owner@example.com", role: "owner", status: "active" });
    // The password must never be recoverable from the row.
    expect(account.passwordHash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(account.passwordHash).not.toContain(input.password);
  });

  it("turns a real unique violation on email into 409 and rolls the org back", async () => {
    expect((await post("register", input)).status).toBe(201);
    const duplicate = await post("register", { ...input, email: "OWNER@EXAMPLE.COM", organization: "Impostor" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("account_exists");

    // The transaction must have removed the organisation the second attempt created.
    const orgs = await db.db.select().from(organisations);
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe("Acme");
    const memberRows = await db.db.select().from(members);
    expect(memberRows).toHaveLength(1);
  });

  it("signs in with the new credentials and rejects a wrong password", async () => {
    const created = await post("register", input);
    const ok = await post("login", { email: input.email, password: input.password });
    expect(ok.status).toBe(200);
    expect(ok.body.principal).toEqual(created.body.principal);
    expect((await post("login", { email: input.email, password: "not the password" })).status).toBe(401);
    expect((await post("login", { email: "nobody@example.com", password: input.password })).status).toBe(401);
  });

  it("completes a reset against a real token row and invalidates it", async () => {
    await post("register", input);
    const requested = await post("password-reset/request", { email: input.email });
    expect(requested.status).toBe(202);
    expect(mail).toHaveLength(1);

    const token = new URL(mail[0].resetUrl).searchParams.get("token")!;
    const [row] = await db.db.select().from(passwordResets);
    // Stored as a digest, with a bounded lifetime.
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toHaveLength(64);
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const confirmed = await post("password-reset/confirm", { token, password: "a brand new passphrase" });
    expect(confirmed.status).toBe(200);

    const [after] = await db.db.select().from(accounts);
    expect(after.passwordHash).not.toBe(row.tokenHash);
    expect((await post("login", { email: input.email, password: "a brand new passphrase" })).status).toBe(200);
    expect((await post("login", { email: input.email, password: input.password })).status).toBe(401);

    // Spent: the row is gone and the same token cannot be replayed.
    expect(await db.db.select().from(passwordResets)).toHaveLength(0);
    const replay = await post("password-reset/confirm", { token, password: "yet another passphrase" });
    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe("invalid_token");
  });

  it("verifies an account with a real single-use database token", async () => {
    requireVerification = true;
    const pending = await post("register", input);
    expect(pending.status).toBe(202);
    expect(pending.body).toEqual({
      pendingVerification: true,
      email: "owner@example.com",
    });
    expect(verificationMail).toHaveLength(1);

    const token = new URL(verificationMail[0].verifyUrl).searchParams.get("token")!;
    const [stored] = await db.db.select().from(emailVerifications);
    expect(stored.email).toBe("owner@example.com");
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const verified = await post("verify-email", { token });
    expect(verified.status).toBe(200);
    expect(verified.body.principal.email).toBe("owner@example.com");
    expect(await db.db.select().from(emailVerifications)).toHaveLength(0);

    const [account] = await db.db.select().from(accounts);
    expect(account.emailVerifiedAt).not.toBeNull();
    expect((await post("verify-email", { token })).body.error).toBe("invalid_token");
  });

  it("honours the expiry the real timestamp column stores", async () => {
    await post("register", input);
    await post("password-reset/request", { email: input.email });
    const token = new URL(mail[0].resetUrl).searchParams.get("token")!;
    await db.db.execute(sql`UPDATE password_resets SET expires_at = now() - interval '1 second'`);
    const expired = await post("password-reset/confirm", { token, password: "a fresh passphrase here" });
    expect(expired.status).toBe(400);
    expect(expired.body.error).toBe("invalid_token");
  });

  it("replaces an outstanding link when a second is requested", async () => {
    await post("register", input);
    await post("password-reset/request", { email: input.email });
    const stale = new URL(mail[0].resetUrl).searchParams.get("token")!;
    await post("password-reset/request", { email: input.email });
    expect(await db.db.select().from(passwordResets)).toHaveLength(1);
    expect((await post("password-reset/confirm", { token: stale, password: "a fresh passphrase here" })).status).toBe(400);
  });
});
