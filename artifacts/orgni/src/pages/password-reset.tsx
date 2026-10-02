import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AuthCard, AuthSubmit, FormError, PasswordField, TextField } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useSeo } from "@/hooks/use-seo";

const messages: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  invalid_password: "Use a password between 12 and 128 characters.",
  invalid_token: "This reset link is invalid or has expired. Request a new one.",
  password_mismatch: "Your passwords do not match.",
  too_many_attempts: "Too many attempts. Please wait a few minutes and try again.",
  persistence_unavailable: "Account services are temporarily unavailable. Please try again later.",
};

const SENT =
  "If an account exists for that address, a reset link is on its way. The link expires in 30 minutes.";

function describe(err: unknown): string {
  if (!(err instanceof ApiError)) return "Could not connect. Please try again.";
  return messages[err.code] ?? "Something went wrong. Please try again.";
}

/**
 * GET /forgot-password — request a reset link.
 *
 * The confirmation copy is deliberately the same whether or not the address is
 * registered, because the API is enumeration-safe and the UI must not undo that.
 */
export function ForgotPassword() {
  useSeo({ title: "Reset password - Orgni", description: "Reset your Orgni password.",
    path: "/forgot-password", robots: "noindex, nofollow, noarchive" });
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      eyebrow="RECOVER"
      title="Reset your password"
      description="We'll email you a link to choose a new one. The link expires in 30 minutes."
      panel={{
        kicker: "Account recovery",
        headline: "Tell us the address on the account and we will send a link straight to it.",
      }}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <>
          <p className="text-sm text-foreground" role="status">
            {SENT}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Wrong address?{" "}
            <button
              type="button"
              className="text-foreground underline underline-offset-4"
              onClick={() => setSent(false)}
            >
              Try another
            </button>
          </p>
        </>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" aria-busy={busy} aria-describedby={error ? "reset-error" : undefined}>
          <fieldset disabled={busy} className="space-y-5">
            <TextField id="email" label="Work email" type="email" autoComplete="email"
              placeholder="you@company.com" maxLength={254} required
              value={email} onChange={setEmail} />
            {error && <FormError id="reset-error">{error}</FormError>}
            <AuthSubmit busy={busy} idle="Send reset link" pending="Sending…" />
          </fieldset>
        </form>
      )}
    </AuthCard>
  );
}

/** GET /reset-password?token=… — spend a reset token on a new password. */
export function ResetPassword() {
  useSeo({ title: "Choose a new password - Orgni", description: "Choose a new Orgni password.",
    path: "/reset-password", robots: "noindex, nofollow, noarchive" });
  const { confirmPasswordReset } = useAuth();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <AuthCard
        eyebrow="RECOVER"
        title="Reset link needed"
        description="This page works from the link we email you. Request a new one and we'll send it straight away."
        panel={{
          kicker: "Link expired",
          headline: "Reset links work once and last 30 minutes. We can always send you another.",
        }}
        footer={
          <Link href="/forgot-password" className="text-foreground underline underline-offset-4">
            Request a new link
          </Link>
        }
      />
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password !== confirmation) {
      setError(messages.password_mismatch);
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      navigate("/app");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      eyebrow="RECOVER"
      title="Choose a new password"
      description="Pick something you don't use anywhere else."
      footer={
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" aria-busy={busy} aria-describedby={error ? "reset-error" : undefined}>
        <fieldset disabled={busy} className="space-y-5">
          <PasswordField id="password" label="New password" autoComplete="new-password"
            minLength={12} maxLength={128} required
            help="Use 12–128 characters. A long, unique passphrase works well."
            value={password} onChange={setPassword} />
          <PasswordField id="confirmation" label="Confirm new password"
            autoComplete="new-password" maxLength={128} required
            value={confirmation} onChange={setConfirmation} />
          {error && <FormError id="reset-error">{error}</FormError>}
          <AuthSubmit busy={busy} idle="Update password" pending="Updating…" />
        </fieldset>
      </form>
    </AuthCard>
  );
}