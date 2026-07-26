import { Router, type IRouter, type Request, type Response } from "express";
import { config } from "../lib/config";
import { issueToken, tenantIdFromOrg } from "../lib/auth";
import { authenticate } from "../lib/authenticate";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEV_ONLY_SECRET = "dev-only-insecure-secret-change-me";

/**
 * POST /api/auth/login
 *
 * Dev-mode login: passwordless, for local development only.
 * Disabled in production — replace with your OIDC provider (e.g. Entra External ID).
 *
 * PRODUCTION GUARD: this endpoint returns 404 in production so it cannot be
 * used to mint bearer tokens for arbitrary tenants. Set AUTH_SECRET to a strong
 * random value in any shared environment to prevent token forgery even in dev.
 */
router.post("/auth/login", (req: Request, res: Response) => {
  // Disabled entirely in production — callers must use the OIDC flow.
  if (config.NODE_ENV === "production") {
    res.status(404).json({ error: "not_found" });
    return;
  }

  // Fail fast in any environment where the insecure default secret is still set,
  // to prevent accidental exposure if NODE_ENV is misconfigured.
  if (config.AUTH_SECRET === DEV_ONLY_SECRET && config.NODE_ENV !== "development") {
    res.status(500).json({ error: "insecure_auth_secret" });
    return;
  }

  const email = String(req.body?.email ?? "").trim();
  const organization = String(req.body?.organization ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  if (!organization) {
    res.status(400).json({ error: "missing_organization" });
    return;
  }

  const tenantId = tenantIdFromOrg(organization);
  const { token, principal } = issueToken(
    { email, tenantId, roles: ["Owner"] },
    config.AUTH_SECRET,
  );

  res.json({
    token,
    principal: {
      email: principal.sub,
      tenantId: principal.tenantId,
      organization,
      roles: principal.roles,
    },
  });
});

/** GET /api/auth/me — who the current session belongs to. */
router.get("/auth/me", authenticate, (req: Request, res: Response) => {
  const p = req.principal!;
  res.json({ email: p.sub, tenantId: p.tenantId, roles: p.roles });
});

export default router;
