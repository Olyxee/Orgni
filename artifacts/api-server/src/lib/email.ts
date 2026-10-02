/**
 * Outbound email — currently just member invites.
 *
 * Uses Resend's HTTP API when RESEND_API_KEY + EMAIL_FROM are set. Otherwise
 * it's a no-op that logs, so the app runs without email configured.
 */
import { config } from "./config";
import { logger } from "./logger";

const RESEND_URL = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(config.RESEND_API_KEY && config.EMAIL_FROM);
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
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
      body: JSON.stringify({ from: config.EMAIL_FROM, to, subject, html }),
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
  const appUrl = config.APP_BASE_URL ?? config.PUBLIC_BASE_URL ?? "";
  const link = appUrl ? `${appUrl.replace(/\/+$/, "")}/login` : "";
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#171717">
      <p>You've been added to <strong>${escapeHtml(input.organisationName)}</strong> on Orgni${
        input.invitedByEmail ? ` by ${escapeHtml(input.invitedByEmail)}` : ""
      }.</p>
      <p>Orgni helps keep work moving across your organisation. You can use it in
      Microsoft Teams, and sign in to the web console with this email address.</p>
      ${link ? `<p><a href="${link}" style="color:#FE5101">Open Orgni</a></p>` : ""}
    </div>`;
  return send(input.to, `You've been added to Orgni — ${input.organisationName}`, html);
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
  const hours = Math.max(1, Math.round(input.expiresInMinutes / 60));
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#171717">
      <p>We received a request to reset the Orgni password for this address.</p>
      <p><a href="${escapeHtml(input.resetUrl)}" style="color:#FE5101">Choose a new password</a></p>
      <p style="color:#666;font-size:13px">This link expires in ${hours} hour${
        hours === 1 ? "" : "s"
      } and can only be used once. If you did not request this, you can ignore
      this email — your password will not change.</p>
    </div>`;
  return send(input.to, "Reset your Orgni password", html);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
