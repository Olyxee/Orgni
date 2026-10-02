/**
 * Outbound email rendering.
 *
 * The reset email once claimed a 30-minute link was good for "1 hour", which
 * is security copy lying to the user. The duration cases below lock that down.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/config", () => ({
  config: {
    DATABASE_URL: "test",
    NODE_ENV: "test",
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "no-reply@orgni.test",
    APP_BASE_URL: "https://app.orgni.test",
    PUBLIC_BASE_URL: undefined,
  },
}));

const { sendPasswordReset, sendMemberInvite, emailConfigured } = await import("../src/lib/email");
const { duration, sanitizeSubject, BRAND } = await import("../src/lib/email-layout");

let sent: { to: string; subject: string; html: string; text: string };

beforeEach(() => {
  sent = { to: "", subject: "", html: "", text: "" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: any) => {
      sent = JSON.parse(init.body);
      return { ok: true, status: 200, text: async () => "{}" } as any;
    }),
  );
});

describe("duration", () => {
  it("states sub-hour windows in minutes instead of rounding up", () => {
    expect(duration(30)).toBe("30 minutes");
    expect(duration(45)).toBe("45 minutes");
    expect(duration(1)).toBe("1 minute");
    expect(duration(60)).toBe("1 hour");
    expect(duration(120)).toBe("2 hours");
  });
});

describe("subject handling", () => {
  it("strips newlines so a name cannot split into extra headers", () => {
    expect(sanitizeSubject("Acme\r\nBcc: victim@x.com")).toBe("Acme Bcc: victim@x.com");
    expect(sanitizeSubject("  spaced  ")).toBe("spaced");
  });
});

describe("password reset email", () => {
  const reset = (minutes = 30) =>
    sendPasswordReset({
      to: "user@example.com",
      resetUrl: "https://app.orgni.test/reset-password?token=abc123&x=1",
      expiresInMinutes: minutes,
    });

  it("reports the real expiry rather than rounding a sub-hour window up", async () => {
    await reset(30);
    expect(sent.text).toContain("expires in 30 minutes");
    expect(sent.text).not.toContain("1 hour");
  });

  it("carries the link in both parts so it survives a text-only client", async () => {
    await reset();
    expect(sent.text).toContain("https://app.orgni.test/reset-password?token=abc123&x=1");
    expect(sent.html).toContain("https://app.orgni.test/reset-password?token=abc123&amp;x=1");
    // The bare URL in the HTML is the fallback for clients that drop buttons.
    expect(sent.html).toMatch(/Or use this link/);
  });

  it("is a complete document that opts out of client dark-mode inversion", async () => {
    await reset();
    expect(sent.html.startsWith("<!doctype html>")).toBe(true);
    expect(sent.html).toContain('name="viewport"');
    expect(sent.html).toContain('name="color-scheme" content="light"');
    // The preheader text lives in the hidden divider, not in a class name.
    expect(sent.html).toMatch(/display:none[^>]*>Reset your Orgni password/);
  });

  it("uses the brand token and the mark served by the web app", async () => {
    await reset();
    expect(sent.html).toContain(BRAND);
    expect(sent.html).toContain("https://app.orgni.test/orgni-mark.png");
  });

  it("reassures a user who did not ask for the reset", async () => {
    await reset();
    expect(sent.text).toContain("your password will not change");
  });
});

describe("member invite email", () => {
  it("names the organisation and escapes it in the body", async () => {
    await sendMemberInvite({
      to: "new@example.com",
      organisationName: "Acme <script>",
      invitedByEmail: "owner@example.com",
    });
    expect(sent.html).toContain("Acme &lt;script&gt;");
    expect(sent.html).not.toContain("<script>");
    expect(sent.subject).toBe("Acme <script> invited you to Orgni");
    expect(sent.text).toContain("Open Orgni: https://app.orgni.test/login");
  });

  it("survives a newline in the organisation name", async () => {
    await sendMemberInvite({
      to: "new@example.com",
      organisationName: "Acme\r\nBcc: victim@x.com",
      invitedByEmail: null,
    });
    expect(sent.subject).not.toContain("\n");
  });
});

describe("configuration", () => {
  it("reports configured when both key and from address are present", () => {
    expect(emailConfigured()).toBe(true);
  });
});