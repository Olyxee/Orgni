import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const version = "0.0.0";
import { config } from "../lib/config";

const router: IRouter = Router();

/** Legacy health check (kept for Replit deployment health probes). */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Liveness: process is up and serving requests. */
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Readiness: dependencies are reachable and the service can take traffic.
 * Dependency checks (database, Redis) get added here as they are wired in;
 * today the API is stateless, so ready === live. Responses never include
 * connection strings or other infrastructure details.
 */
router.get("/health/ready", (_req, res) => {
  res.json({ status: "ok", checks: {} });
});

/** Build/version metadata for deploy verification. No secrets. */
router.get("/version", (_req, res) => {
  res.json({
    name: "orgni-api",
    version: config.APP_VERSION ?? version,
    gitSha: config.GIT_SHA ?? null,
    nodeEnv: config.NODE_ENV,
  });
});

export default router;
