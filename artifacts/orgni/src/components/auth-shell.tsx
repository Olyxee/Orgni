/**
 * Shared frame for the unauthenticated credential screens.
 *
 * Sign-in, sign-up and password recovery all render through these so the
 * recovery flow cannot drift away from the sign-in flow it sits beside.
 *
 * The layout is a split card: a near-black brand panel beside the form. Black
 * rather than an orange gradient, because the Orgni mark is orange and would
 * disappear into it — and because the inverted card on the pricing page is
 * already the brand's established dark treatment.
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

const MARK = `${import.meta.env.BASE_URL}orgni-mark.png`;

/** Concentric arcs behind the panel, echoing the converging-lines motif on
 *  the product hero. Purely decorative, so hidden from assistive tech. */
const ARCS = [90, 150, 210, 270, 330, 390, 450];

function PanelBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 100 160"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full text-primary/25"
      >
        {ARCS.map((r) => (
          <circle
            key={r}
            cx="16"
            cy="12"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {/* Oversized mark, bleeding off the corner. */}
      <img
        src={MARK}
        alt=""
        className="absolute -right-28 -top-24 w-[460px] opacity-[0.08]"
      />
      {/* Warmth gathering behind the mark. */}
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
    </div>
  );
}

function BrandLock({ tone }: { tone: "onDark" | "onLight" }) {
  return (
    <Link
      href="/"
      className={`flex min-h-10 items-center gap-3 ${tone === "onDark" ? "justify-start" : ""}`}
    >
      <img src={MARK} alt="Orgni logo" className="h-8 w-8 object-contain" />
      <span className="font-serif text-2xl leading-none">Orgni</span>
    </Link>
  );
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-background shadow-sm dark:border-zinc-800 lg:grid-cols-2">
        {/* Brand panel. Hidden on small screens, where the lock above the form
            carries the identity instead. */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-zinc-900 p-10 text-zinc-50 lg:flex xl:p-12">
          <PanelBackdrop />
          <div className="relative">
            <BrandLock tone="onDark" />
          </div>
          <div className="relative">
            <p className="mb-3 font-mono text-xs font-bold text-primary">
              Operational intelligence
            </p>
            <p className="max-w-sm text-2xl font-semibold leading-tight tracking-tight xl:text-3xl">
              Understand what is happening in your organisation, and keep work
              moving.
            </p>
          </div>
        </aside>

        <div className="p-8 sm:p-12">
          <div className="mb-8 lg:hidden">
            <BrandLock tone="onLight" />
          </div>

          {eyebrow && (
            <div className="mb-3 font-mono text-xs font-bold text-primary">{eyebrow}</div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
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