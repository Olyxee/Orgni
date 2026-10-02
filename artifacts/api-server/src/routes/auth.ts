import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createDb } from "@workspace/db/connect";
import { accounts, organisations } from "@workspace/db/schema";
import { authSecret, config } from "../lib/config";
import { issueToken } from "../lib/auth";
import { authenticate } from "../lib/authenticate";
import { hashPassword, verifyPassword } from "../lib/passwords";

const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;
const router: IRouter = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Bounded per-process abuse protection. Apply a shared gateway limit across replicas.
const attempts = new Map<string, { count: number; until: number }>();
function limit(req: Request, res: Response): boolean {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.ip ?? "unknown";
  const value = attempts.get(key) ?? { count: 0, until: now + 60_000 };
  if (value.count >= 10 || (!attempts.has(key) && attempts.size >= 10_000)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "too_many_attempts" });
    return false;
  }
  value.count++;
  attempts.set(key, value);
  return true;
}

for (const action of ["register", "login"] as const) {
  router.post(`/auth/${action}`, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (!limit(req, res)) return;
    if (!store) { res.status(503).json({ error: "persistence_unavailable" }); return; }
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const organization = typeof req.body?.organization === "string" ? req.body.organization.trim() : "";
    if (email.length > 254 || !EMAIL_RE.test(email)) { res.status(400).json({ error: "invalid_email" }); return; }
    if (password.length > 128 || (action === "register" ? password.length < 12 : !password)) {
      res.status(400).json({ error: "invalid_password" }); return;
    }
    if (action === "register" && (!organization || organization.length > 120)) {
      res.status(400).json({ error: "invalid_organization" }); return;
    }
    if (action === "register" && password !== req.body?.confirmPassword) {
      res.status(400).json({ error: "password_mismatch" }); return;
    }
    try {
      let tenantId: string;
      let name: string;
      if (action === "register") {
        tenantId = `tenant_${randomUUID()}`;
        name = organization;
        const passwordHash = await hashPassword(password);
        await store.db.transaction(async (tx) => {
          await tx.insert(organisations).values({ tenantId, name, workEmail: email });
          await tx.insert(accounts).values({ email, tenantId, passwordHash });
        });
      } else {
        const [account] = await store.db.select().from(accounts).where(eq(accounts.email, email));
        // Perform the same password work even for unknown emails.
        const valid = await verifyPassword(password, account?.passwordHash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`);
        if (!account || !valid) { res.status(401).json({ error: "invalid_credentials" }); return; }
        tenantId = account.tenantId;
        const [org] = await store.db.select().from(organisations).where(eq(organisations.tenantId, tenantId));
        if (!org) throw new Error("Account organization missing");
        name = org.name;
      }
      const { token, principal } = issueToken({ email, tenantId, roles: ["Owner"] }, authSecret);
      res.status(action === "register" ? 201 : 200).json({
        token, principal: { email, tenantId, organization: name, roles: principal.roles },
      });
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } };
      if (action === "register" && (cause.code === "23505" || cause.cause?.code === "23505")) {
        res.status(409).json({ error: "account_exists" });
      } else {
        res.status(503).json({ error: "persistence_unavailable" });
      }
    }
  });
}
router.get("/auth/me", authenticate, (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const p = req.principal!;
  res.json({ email: p.sub, tenantId: p.tenantId, roles: p.roles });
});
export default router;
