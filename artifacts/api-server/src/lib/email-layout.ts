/**
 * Shared HTML/text layout for outbound email.
 *
 * Email clients are not browsers, so this does the unglamorous work once
 * instead of per template:
 *
 * - a full document, because Outlook does not repair fragments reliably
 * - an Outlook-safe table button rather than a padded anchor
 * - a plain-text alternative, without which the reset link is invisible to
 *   text-only clients and screen readers
 * - a preheader, so the inbox preview is chosen rather than whatever happens
 *   to be the first words
 *
 * Dark mode is deliberately opted *out* via `color-scheme: light`. iOS Mail and
 * Outlook otherwise invert our near-black text on a white card and can render
 * it white-on-white. Shipping real dark styles later is the better fix.
 */
import { config } from "./config";

/** hsl(19 99% 50%) — the --primary token. Kept here so it cannot drift. */
export const BRAND = "#FE5101";

const INK = "#121212";
const MUTED = "#6b6b6b";
const HAIRLINE = "#e7e5e4";
const CANVAS = "#faf9f8";

/** The mark is served by the web app, so no CDN or attachment is needed. */
export function logoUrl(): string {
  const base = (config.APP_BASE_URL ?? config.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/orgni-mark.png` : "";
}

export function appUrl(path = ""): string {
  const base = (config.APP_BASE_URL ?? config.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${path}` : "";
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Subject lines must not carry newlines or they split into extra headers. */
export function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").trim();
}

/** Human duration that does not round a sub-hour window up to a whole hour. */
export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = minutes / 60;
  const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}

export interface EmailLayout {
  /** One line, shown in the inbox before the message is opened. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  /** Small print under the action — expiry, security reassurance, etc. */
  note?: string;
}

export function layout(input: EmailLayout): { html: string; text: string } {
  const { preheader, heading, paragraphs, action, note } = input;
  const logo = logoUrl();

  // Zero-width padding pushes the preview past the preheader so the subject
  // line does not bleed into it.
  const hidden = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}${"&#847;&zwnj;&nbsp;".repeat(4)}</div>`;

  const header = `
      <tr>
        <td style="padding:32px 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${logo ? `<td style="padding-right:10px;"><img src="${escapeHtml(logo)}" width="34" height="34" alt="Orgni" style="display:block;border:0;border-radius:6px;"></td>` : ""}
              <td style="font:600 20px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};letter-spacing:-0.02em;">Orgni</td>
            </tr>
          </table>
        </td>
      </tr>`;

  const button = action
    ? `
          <tr>
            <td style="padding:8px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${BRAND}" style="border-radius:999px;">
                    <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 32px;font:500 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(action.label)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 40px 0;font:400 12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:${MUTED};word-break:break-all;">
              Or use this link:<br>${escapeHtml(action.url)}
            </td>
          </tr>`
    : "";

  const noteRow = note
    ? `
          <tr>
            <td style="padding:24px 40px 36px;font:400 13px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${MUTED};">
              ${escapeHtml(note)}
            </td>
          </tr>`
    : `
          <tr><td style="padding:36px 40px;"></td></tr>`;

  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
${hidden}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CANVAS};">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:16px;overflow:hidden;">
${header}
        <tr>
          <td style="padding:32px 40px 0;">
            <h1 style="margin:0 0 16px;font:600 22px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};letter-spacing:-0.02em;">${escapeHtml(heading)}</h1>
            ${paragraphs
              .map(
                (p) =>
                  `<p style="margin:0 0 14px;font:400 15px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">${escapeHtml(p)}</p>`,
              )
              .join("\n            ")}
          </td>
        </tr>${button}${noteRow}
      </table>
      <p style="max-width:560px;margin:20px 0 0;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${MUTED};text-align:center;">
        Operational intelligence for businesses in motion.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `Orgni`,
    ``,
    heading,
    ``,
    ...paragraphs,
    ...(action ? [``, `${action.label}: ${action.url}`] : []),
    ...(note ? [``, note] : []),
    ``,
    `Operational intelligence for businesses in motion.`,
  ].join("\n");

  return { html, text };
}