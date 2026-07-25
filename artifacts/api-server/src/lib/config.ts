import { loadEnv, apiEnvSchema, type ApiEnv } from "@workspace/config";

// On Replit, the session-signing secret is provided as SESSION_SECRET.
// Map it to AUTH_SECRET before validation so tokens are signed with it.
if (!process.env.AUTH_SECRET && process.env.SESSION_SECRET) {
  process.env.AUTH_SECRET = process.env.SESSION_SECRET;
}

/** Validated once at module load — the process fails fast on bad config. */
export const config: ApiEnv = loadEnv(apiEnvSchema);

// Never run production (or any deployed environment) on the known dev-only
// default signing secret — forged bearer tokens would grant tenant access.
if (
  config.NODE_ENV === "production" &&
  config.AUTH_SECRET === "dev-only-insecure-secret-change-me"
) {
  throw new Error(
    "AUTH_SECRET (or SESSION_SECRET) must be set to a strong secret in production.",
  );
}
