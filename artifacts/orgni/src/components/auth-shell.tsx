/**
 * Shared frame for the unauthenticated credential screens.
 *
 * Sign-in, sign-up and password recovery all render through these so the
 * recovery flow cannot drift away from the sign-in flow it sits beside.
 *
 * The treatments deliberately mirror the marketing surface rather than the
 * default form primitives: the orange mono eyebrow and the near-black pill
 * button are the two most recognisable devices on the public site, and a
 * full-width orange button is the one treatment that brand never uses.
 */
import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthCard({
  eyebrow,
  heading,
  children,
  footer,
}: {
  /** Short orange mono label, e.g. "SIGN UP". Mirrors the pricing page. */
  eyebrow?: string;
  heading: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground sm:py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="group mb-10 flex min-h-10 items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}orgni-mark.png`}
            alt="Orgni logo"
            className="h-8 w-8 object-contain"
          />
          <span className="font-serif text-2xl leading-none text-foreground">Orgni</span>
        </Link>

        {eyebrow && (
          <div className="mb-3 font-mono text-xs font-bold text-primary">{eyebrow}</div>
        )}
        <p className="mb-8 text-sm text-muted-foreground">{heading}</p>

        {children}

        {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Full-width submit in the marketing CTA shape: pill, near-black, turning
 * orange on hover. Deliberately no arrow glyph — that marks navigation
 * elsewhere on the site, and this performs an action instead.
 */
export function AuthSubmit({
  idle,
  pending,
  busy,
}: {
  idle: string;
  pending: string;
  busy: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
    >
      {busy ? pending : idle}
    </button>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  id: string;
  label: string;
  help?: string;
  onChange: (value: string) => void;
}

export function TextField({ id, label, help, onChange, ...input }: TextFieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        {...input}
        aria-describedby={helpId}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  );
}

/**
 * Password input with a reveal toggle. Three of the four credential screens
 * ask for a password, and without this there is no way to check what was
 * typed before submitting it.
 */
export function PasswordField({
  id,
  label,
  help,
  value,
  onChange,
  ...input
}: Omit<TextFieldProps, "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const helpId = help ? `${id}-help` : undefined;
  const Icon = visible ? EyeOff : Eye;
  // Two password fields share a screen, so the toggle names its own field.
  // Without this both read simply "Show password" and are indistinguishable.
  const toggleName = `${visible ? "Hide" : "Show"} ${label.toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          {...input}
          type={visible ? "text" : "password"}
          value={value}
          aria-describedby={helpId}
          onChange={(event) => onChange(event.target.value)}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((was) => !was)}
          aria-label={toggleName}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
      {help && (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  );
}

export function FormError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm text-red-500">
      {children}
    </p>
  );
}