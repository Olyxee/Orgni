import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useSeo } from "@/hooks/use-seo";

const messages: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  invalid_organization: "Enter an organization name of up to 120 characters.",
  invalid_password: "Use a password between 12 and 128 characters.",
  password_mismatch: "Your passwords do not match.",
  account_exists: "An account with this email already exists. Please sign in.",
  invalid_credentials: "Email or password is incorrect.",
  too_many_attempts: "Too many attempts. Please wait a minute and try again.",
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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 py-8">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-2xl font-semibold tracking-tight mb-1">Orgni</Link>
        <p className="text-sm text-muted-foreground mb-8">{register ? "Create your Orgni account" : "Sign in to your workspace"}</p>
        <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy} aria-describedby={error ? "auth-error" : undefined}>
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {register && <div className="space-y-1.5">
              <Label htmlFor="org">Organization</Label>
              <Input id="org" autoComplete="organization" placeholder="Acme Inc." maxLength={120} value={organization} onChange={e => setOrganization(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Creates a new private workspace for your account.</p>
            </div>}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 12 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} required aria-describedby={register ? "password-help" : undefined} />
              {register && <p id="password-help" className="text-xs text-muted-foreground">Use 12–128 characters. A long, unique passphrase works well.</p>}
            </div>
            {register && <div className="space-y-1.5">
              <Label htmlFor="confirmation">Confirm password</Label>
              <Input id="confirmation" type="password" autoComplete="new-password" maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} required />
            </div>}
            {error && <p id="auth-error" role="alert" className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? (register ? "Creating account…" : "Signing in…") : (register ? "Create account" : "Sign in")}</Button>
          </fieldset>
        </form>
        <p className="text-sm text-muted-foreground mt-6">
          {register ? "Already have an account? " : "New to Orgni? "}
          <Link href={register ? "/login" : "/sign-up"} className="text-foreground underline">{register ? "Sign in" : "Create account"}</Link>
        </p>
      </div>
    </div>
  );
}
