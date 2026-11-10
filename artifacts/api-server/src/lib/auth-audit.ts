import type { Request } from "express";
import { logger } from "./logger";

export type AuthAuditEvent =
  | "register"
  | "login"
  | "email_verify"
  | "password_reset_request"
  | "password_reset_confirm"
  | "logout";

/**
 * Write a structured authentication event. Only allow-listed metadata is
 * included: never pass request bodies, passwords, session tokens, or reset
 * tokens to this logger.
 */
export function logAuthAudit(
  req: Request,
  event: AuthAuditEvent,
  outcome: "success" | "failure" | "accepted",
  details: {
    reason?: string;
    email?: string | null;
    tenantId?: string | null;
  } = {},
): void {
  const candidateEmail = details.email?.trim().toLowerCase();
  const email = candidateEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)
    ? candidateEmail
    : undefined;
  logger.info(
    {
      audit: {
        category: "authentication",
        event,
        outcome,
        ...(details.reason ? { reason: details.reason } : {}),
        ...(email && email.length <= 254 ? { email } : {}),
        ...(details.tenantId ? { tenantId: details.tenantId } : {}),
        ip: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      },
    },
    "authentication audit",
  );
}
