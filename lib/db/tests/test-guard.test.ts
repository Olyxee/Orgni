/**
 * Tests for the database URL safety guard.
 *
 * These prove that:
 *  - Legitimate test URLs on localhost pass.
 *  - Production-looking URLs that happen to contain "test" in the
 *    username, password, or host (but not the DB name) are rejected.
 *  - Non-localhost hosts are always rejected, even if the DB name
 *    contains "test".
 */
import { describe, expect, it } from "vitest";
import { assertTestDatabaseUrl } from "../src/test-guard";

describe("assertTestDatabaseUrl", () => {
  // ── should pass ──────────────────────────────────────────────
  it("accepts a standard localhost test URL", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://ci:ci@localhost:5432/orgni_test"),
    ).not.toThrow();
  });

  it("accepts 127.0.0.1 with a test DB name", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://user:pass@127.0.0.1:5432/my_test_db"),
    ).not.toThrow();
  });

  it("accepts [::1] (IPv6 loopback)", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://user:pass@[::1]:5432/test"),
    ).not.toThrow();
  });

  it("accepts the CI service container hostname 'postgres'", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://ci:ci@postgres:5432/orgni_test"),
    ).not.toThrow();
  });

  // ── should reject: "test" in username, not in DB name ────────
  it("rejects when 'test' is only in the username", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://test_admin:secret@localhost:5432/production_db"),
    ).toThrow("Database name does not contain 'test'");
  });

  // ── should reject: "test" in password, not in DB name ────────
  it("rejects when 'test' is only in the password", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://admin:test_secret@localhost:5432/production_db"),
    ).toThrow("Database name does not contain 'test'");
  });

  // ── should reject: "test" in hostname, not in DB name ────────
  it("rejects when 'test' is only in the hostname", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://admin:secret@test.db.example.com:5432/production_db"),
    ).toThrow("Database name does not contain 'test'");
  });

  // ── should reject: production host even with test DB name ────
  it("rejects a remote host even when DB name contains 'test'", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://admin:secret@db.prod.example.com:5432/orgni_test"),
    ).toThrow("Database host is not localhost");
  });

  // ── combined trap: "test" in user AND host, not in DB name ───
  it("rejects a production URL where 'test' appears in user and host but not DB", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://test_user:pw@test.db.prod.com:5432/orgni_production"),
    ).toThrow("Database name does not contain 'test'");
  });

  // ── should reject: not a URL at all ──────────────────────────
  it("rejects an unparseable string", () => {
    expect(() =>
      assertTestDatabaseUrl("not-a-url"),
    ).toThrow("not a valid URL");
  });

  // ── error messages must never contain the URL ────────────────
  it("never leaks the URL in the error message", () => {
    const dangerousUrl = "postgresql://test_admin:S3CRET@prod.db.example.com:5432/orgni_production";
    try {
      assertTestDatabaseUrl(dangerousUrl);
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).not.toContain("S3CRET");
      expect(msg).not.toContain("prod.db.example.com");
      expect(msg).not.toContain(dangerousUrl);
    }
  });
});
