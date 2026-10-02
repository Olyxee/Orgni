/**
 * Per-IP rate limiting for the credential endpoints.
 *
 * Only *rejected* attempts count against the credential budget, and a success
 * clears it. That matters because a corporate NAT egress is a single `req.ip`
 * for an entire office: counting every request throttles honest users, while
 * counting only failures still stops credential guessing.
 *
 * State is per process. Behind a horizontally scaled deployment (Azure
 * Container Apps) each replica keeps its own counters, so add a shared
 * gateway limit as well if brute-force resistance matters at that scale.
 */
import type { Request, Response } from "express";

export interface ThrottlePolicy {
  /** Attempts allowed per window. */
  limit: number;
  windowMs: number;
  /**
   * "failure" charges rejected attempts and clears on success.
   * "success" charges completed attempts, so mistyped input is never punished.
   * "request" charges every attempt, for endpoints that cost something per call.
   */
  mode: "failure" | "success" | "request";
}

/** Sign-in and password-reset confirmation: guess resistance, generous ceiling. */
export const credentialPolicy: ThrottlePolicy = {
  limit: 20,
  windowMs: 15 * 60_000,
  mode: "failure",
};

/** Completed registrations: stops mass organisation creation without punishing typos. */
export const signupPolicy: ThrottlePolicy = {
  limit: 10,
  windowMs: 60 * 60_000,
  mode: "success",
};

/** Reset emails: each one is an outbound message, so cap the attempts themselves. */
export const recoveryPolicy: ThrottlePolicy = {
  limit: 10,
  windowMs: 60 * 60_000,
  mode: "request",
};

interface Bucket {
  count: number;
  until: number;
}

const MAX_BUCKETS = 50_000;
const SWEEP_INTERVAL_MS = 60_000;
const buckets = new Map<string, Bucket>();
let sweptAt = 0;

/** Drop expired buckets, at most once per interval to keep requests O(1). */
function sweep(now: number): void {
  if (now - sweptAt < SWEEP_INTERVAL_MS) return;
  sweptAt = now;
  for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
}

function clientKey(req: Request): string {
  return req.ip ?? "unknown";
}

function bucketFor(name: string, req: Request, policy: ThrottlePolicy, now: number): Bucket {
  const id = `${name}|${clientKey(req)}`;
  const existing = buckets.get(id);
  if (existing && existing.until > now) return existing;
  // Map preserves insertion order, so this evicts the oldest bucket.
  if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value!);
  const fresh: Bucket = { count: 0, until: now + policy.windowMs };
  buckets.set(id, fresh);
  return fresh;
}

/**
 * Reject with 429 when the caller is over budget. Call before doing any work.
 * Returns false once it has already written the response.
 */
export function enforce(
  policy: ThrottlePolicy,
  name: string,
  req: Request,
  res: Response,
): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = bucketFor(name, req, policy, now);
  if (bucket.count >= policy.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.until - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "too_many_attempts" });
    return false;
  }
  if (policy.mode === "request") bucket.count++;
  return true;
}

/** Record how the attempt ended, according to the policy's mode. */
export function recordOutcome(
  policy: ThrottlePolicy,
  name: string,
  req: Request,
  outcome: "success" | "failure",
): void {
  const id = `${name}|${clientKey(req)}`;
  // A successful credential attempt means the caller is not guessing.
  if (policy.mode === "failure" && outcome === "success") {
    buckets.delete(id);
    return;
  }
  const charge = policy.mode === "success" ? outcome === "success" : outcome === "failure";
  if (charge) bucketFor(name, req, policy, Date.now()).count++;
}
