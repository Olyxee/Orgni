/**
 * Outbound email: member invites and password recovery.
 *
 * Uses Resend's HTTP API when RESEND_API_KEY + EMAIL_FROM are set. Otherwise
 * it's a no-op that logs, so the app runs without email configured.
 *
 * Layout lives in email-layout.ts; this file is only the copy.
 */
import { config } from "./config";
import { logger } from "./logger";
import { appUrl, duration, layout, sanitizeSubject } from "./email-layout";

const RESEND_URL = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(config.RESEND_API_KEY && config.EMAIL_FROM);
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  if (!emailConfigured()) {
    logger.info({ to, subject }, "email not configured — skipped");
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      // The text part is not optional: without it the message is unreadable in
      // plain-text clients, and for a reset email that means the link is lost.
      body: JSON.stringify({ from: config.EMAIL_FROM, to, subject, html, text }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, "email send failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "email send threw");
    return false;
  }
}

export async function sendMemberInvite(input: {
  to: string;
  organisationName: string;
  invitedByEmail: string | null;
}): Promise<boolean> {
  const org = input.organisationName;
  const inviter = input.invitedByEmail
    ? `${input.invitedByEmail} has added you`
    : "You have been added";
  const link = appUrl("/login");
  const { html, text } = layout({
    preheader: `${org} invited you to Orgni`,
    heading: `Join ${org} on Orgni`,
    paragraphs: [
      `${inviter} to ${org} on Orgni.`,
      "You will be able to see what is happening across the organisation and keep work moving — in Microsoft Teams and in the web console.",
    ],
    action: link ? { label: "Open Orgni", url: link } : undefined,
    note: "Sign in with this email address. If you do not have an account yet, create one with the same address.",
  });
  return send(input.to, sanitizeSubject(`${org} invited you to Orgni`), html, text);
}

/**
 * Password-reset link for an existing account.
 *
 * Sent only in response to a request for an address that actually has an
 * account, so the endpoint that triggers it can stay enumeration-safe.
 */
export async function sendPasswordReset(input: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<boolean> {
  const { html, text } = layout({
    preheader: "Reset your Orgni password",
    heading: "Reset your password",
    paragraphs: [
      "We received a request to reset the Orgni password for this address. Choose a new one using the button below.",
    ],
    action: { label: "Choose a new password", url: input.resetUrl },
    // Stated in the unit it actually is. Rounding 30 minutes up to "1 hour"
    // told users they had twice the time they really had.
    note: `This link can only be used once and expires in ${duration(input.expiresInMinutes)}. If you did not request a reset, ignore this email — your password will not change.`,
  });
  return send(input.to, "Reset your Orgni password", html, text);
}