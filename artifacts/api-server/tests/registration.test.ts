import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { accounts, organisations } from "@workspace/db/schema";
import { verifyToken } from "../src/lib/auth";
import { hashPassword, verifyPassword } from "../src/lib/passwords";

const state = vi.hoisted(() => ({ rows: new Map<string, any>(), orgs: new Map<string, any>(), failure: false }));
vi.mock("../src/lib/config", () => ({ config: { DATABASE_URL: "test", NODE_ENV: "production" }, authSecret: "test-secret" }));
vi.mock("@workspace/db/connect", () => ({ createDb: () => ({ db: {
  async transaction(fn: any) {
    const rows = new Map(state.rows), orgs = new Map(state.orgs);
    try {
      return await fn({ insert: (table: any) => ({ values: async (value: any) => {
        if (state.failure) throw new Error("database unavailable");
        if (table === accounts) {
          if (state.rows.has(value.email)) throw { cause: { code: "23505" } };
          state.rows.set(value.email, value);
        } else state.orgs.set(value.tenantId, value);
      } }) });
    } catch (err) { state.rows = rows; state.orgs = orgs; throw err; }
  },
  select: () => ({ from: (table: any) => ({ where: async () => {
    if (state.failure) throw new Error("database unavailable");
    return [...(table === accounts ? state.rows : state.orgs).values()];
  } }) }),
} }) }));

import router from "../src/routes/auth";
let server: Server;
let base: string;
let client = 0;
async function post(action: string, body: unknown) {
  const response = await fetch(`${base}/auth/${action}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${client}` }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
}
const input = { email: " Owner@Example.com ", organization: "Acme", password: "a long secret passphrase", confirmPassword: "a long secret passphrase" };
beforeAll(async () => {
  const app = express(); app.set("trust proxy", true); app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
beforeEach(() => { client++; state.rows.clear(); state.orgs.clear(); state.failure = false; });

describe("credential registration and sign in", () => {
  it("validates email, organization, password length and confirmation", async () => {
    for (const [patch, error] of [
      [{ email: 123 }, "invalid_email"], [{ organization: " " }, "invalid_organization"],
      [{ password: "short" }, "invalid_password"], [{ password: "x".repeat(129) }, "invalid_password"],
      [{ confirmPassword: "different" }, "password_mismatch"],
    ] as const) {
      const result = await post("register", { ...input, ...patch });
      expect(result.status).toBe(400); expect(result.body.error).toBe(error);
    }
    expect(state.rows.size).toBe(0);
  });
  it("persists only a hash, issues a session and supports subsequent sign in", async () => {
    const created = await post("register", input);
    expect(created.status).toBe(201); expect(created.cache).toBe("no-store");
    expect(created.body.principal.email).toBe("owner@example.com");
    expect(verifyToken(created.body.token, "test-secret")?.tenantId).toBe(created.body.principal.tenantId);
    const account = state.rows.get("owner@example.com");
    expect(account.passwordHash).not.toContain(input.password);
    expect(await verifyPassword(input.password, account.passwordHash)).toBe(true);
    const login = await post("login", { email: input.email, password: input.password });
    expect(login.status).toBe(200); expect(login.body.principal).toEqual(created.body.principal);
    expect((await post("login", { email: input.email, password: "wrong" })).status).toBe(401);
    expect((await post("login", { email: input.email, organization: input.organization })).status).toBe(400);
  });
  it("rejects case-insensitive duplicate accounts without leaving an extra organization", async () => {
    expect((await post("register", input)).status).toBe(201);
    const duplicate = await post("register", { ...input, email: "OWNER@EXAMPLE.COM" });
    expect(duplicate.status).toBe(409); expect(duplicate.body.error).toBe("account_exists");
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
    expect(result.status).toBe(503); expect(result.body.token).toBeUndefined();
  });
  it("rejects unknown accounts with the same credential error", async () => {
    const result = await post("login", { email: "unknown@example.com", password: input.password });
    expect(result.status).toBe(401); expect(result.body.error).toBe("invalid_credentials");
  });
  it("limits repeated attempts", async () => {
    for (let i = 0; i < 10; i++) await post("login", {});
    expect((await post("login", {})).status).toBe(429);
  });
});

describe("password hashing", () => {
  it("salts identical passwords differently and rejects malformed hashes", async () => {
    expect(await hashPassword(input.password)).not.toBe(await hashPassword(input.password));
    expect(await verifyPassword(input.password, "broken")).toBe(false);
  });
});
