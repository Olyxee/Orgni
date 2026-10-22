/**
 * Safety guard that prevents database tests from running against anything
 * other than a genuine test database on localhost.
 *
 * Rules:
 *  1. The database name (URL pathname) must contain "test".
 *  2. The hostname must be localhost, 127.0.0.1, ::1, or the CI service
 *     container hostname "postgres" (GitHub Actions docker services).
 *
 * Having "test" elsewhere in the URL (e.g. in the username, password, or
 * hostname) is NOT sufficient.  The error message never includes the URL
 * so that credentials are never accidentally logged.
 */

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

/**
 * Parses a Postgres connection URL and verifies it is safe for tests.
 * Throws a generic error (no URL in the message) if any check fails.
 */
export function assertTestDatabaseUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      "Database URL is not a valid URL. Refusing to run tests.",
    );
  }

  // pathname is "/<dbname>" — strip the leading slash.
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!dbName.includes("test")) {
    throw new Error(
      "Database name does not contain 'test'. Refusing to run tests.",
    );
  }

  // Normalise the hostname (URL class lowercases it, but brackets around
  // IPv6 literals need stripping).
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(
      "Database host is not localhost / 127.0.0.1 / ::1. Refusing to run tests.",
    );
  }
}
