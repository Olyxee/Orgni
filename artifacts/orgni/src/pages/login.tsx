import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { AuthCard, AuthSubmit, FormError, PasswordField, TextField } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useSeo } from "@/hooks/use-seo";

const messages: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  invalid_organization: "Enter an organization name of up to 120 characters.",
  invalid_password: "Use a password between 12 and 128 characters.",
  password_mismatch: "Your passwords do not match.",
  account_exists: "An account with this email already exists. Sign in or reset your password.",
  invalid_credentials: "Email or password is incorrect.",
  too_many_attempts: "Too many attempts. Please wait a few minutes and try again.",
  persistence_unavailable: "Account services are temporarily unavailable. Please try again later.",
};

export default function Login({ register = false }: { register?: boolean }) {
  useSeo({ title: `${register ? "Create account" : "Sign in"} - Orgni`,
    description: "Access your private Orgni workspace.", path: register ? "/sign-up" : "/login",
    robots: "noindex, nofollow, noarchive" });
  const { login, signup } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (register && (!organization.trim() || password !== confirmation)) {
      setError(!organization.trim() ? messages.invalid_organization : messages.password_mismatch);
      return;
    }
    setBusy(true);
    try {
      if (register) await signup(email.trim(), organization.trim(), password, confirmation);
      else await login(email.trim(), password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? messages[err.code] ?? "Could not complete your request. Please try again." : "Could not connect. Please try again.");
    } finally { setBusy(false); }
  }
  return (
    <AuthCard
      eyebrow={register ? "CREATE ACCOUNT" : "SIGN IN"}
      title={register ? "Create an account" : "Welcome back"}
      description={
        register
          ? "Set up a private workspace for your organisation in under a minute."
          : "Sign in to your Orgni workspace."
      }
      footer={
        <>
          {register ? "Already have an account? " : "New to Orgni? "}
          <Link href={register ? "/login" : "/sign-up"} className="text-foreground underline underline-offset-4">
            {register ? "Sign in" : "Create account"}
          </Link>
          {!register && (
            <>
              {" · "}
              <Link href="/forgot-password" className="text-foreground underline underline-offset-4">
                Forgot password?
              </Link>
            </>
          )}
          {register && (
            <p className="mt-3 text-xs text-muted-foreground">
              Need SSO or a deployment we run for you?{" "}
              <Link href="/contact" className="text-foreground underline underline-offset-4">
                Talk to sales
              </Link>
            </p>
          )}
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" aria-busy={busy} aria-describedby={error ? "auth-error" : undefined}>
        <fieldset disabled={busy} className="space-y-5">
          <TextField id="email" label="Work email" type="email" autoComplete="email"
            placeholder="you@company.com" maxLength={254} required
            value={email} onChange={setEmail} />
          {register && <TextField id="org" label="Organization" autoComplete="organization"
            placeholder="Acme Inc." maxLength={120} required
            help="Creates a new private workspace for your account."
            value={organization} onChange={setOrganization} />}
          <PasswordField id="password" label="Password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 12 : undefined} maxLength={128} required
            help={register ? "Use 12–128 characters. A long, unique passphrase works well." : undefined}
            value={password} onChange={setPassword} />
          {register && <PasswordField id="confirmation" label="Confirm password"
            autoComplete="new-password" maxLength={128} required
            value={confirmation} onChange={setConfirmation} />}
          {error && <FormError id="auth-error">{error}</FormError>}
          <AuthSubmit busy={busy}
            idle={register ? "Create account" : "Sign in"}
            pending={register ? "Creating account…" : "Signing in…"} />
        </fieldset>
      </form>
    </AuthCard>
  );
}