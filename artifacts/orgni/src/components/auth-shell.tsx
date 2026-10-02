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
import { cn } from "@/lib/utils";

const MARK = `${import.meta.env.BASE_URL}orgni-mark.png`;

/**
 * Oversized Orgni mark, sitting in the gap between the lock and the headline.
 * On this light panel the orange glyph has enough contrast to read at this
 * size, so it can be a real graphic rather than a faint smudge.
 */
function PanelBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-28 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <img
        src={MARK}
        alt=""
        className="absolute right-[-10%] top-1/2 w-[300px] -translate-y-1/2 opacity-[0.18]"
      />
    </div>
  );
}

function BrandLock() {
  return (
    <Link href="/" className="flex min-h-10 items-center gap-3">
      <img src={MARK} alt="Orgni logo" className="h-8 w-8 object-contain" />
      <span className="font-serif text-2xl leading-none text-foreground">Orgni</span>
    </Link>
  );
}

export function AuthCard({
  eyebrow,
  title,
  description,
  panel,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  /**
   * Brand-panel copy, distinct per screen so the four pages do not read alike.
   * Omit it to drop the panel entirely — the card collapses to a single column
   * rather than leaving a gap in the grid.
   */
  panel?: { kicker: string; headline: string };
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50/60 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div
        className={cn(
          "w-full overflow-hidden rounded-3xl border border-orange-100 bg-background shadow-sm dark:border-zinc-800",
          panel ? "max-w-5xl lg:grid lg:grid-cols-2" : "max-w-md",
        )}
      >
        {/* Brand panel. Hidden on small screens, where the lock above the form
            carries the identity instead. */}
        {panel && (
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary/[0.05] p-10 text-foreground lg:flex lg:border-r lg:border-orange-100 dark:lg:border-zinc-800 xl:p-12">
          <PanelBackdrop />
          <div className="relative">
            <BrandLock />
          </div>
          <div className="relative">
            <p className="mb-3 font-mono text-xs font-bold text-primary">
              {panel.kicker}
            </p>
            <p className="max-w-sm text-2xl font-semibold leading-tight tracking-tight text-foreground xl:text-3xl">
              {panel.headline}
            </p>
          </div>
        </aside>
        )}

        <div className="p-8 sm:p-12">
          {/* With no brand panel this is the only place the mark appears, so it
              must show at every width; otherwise it is mobile-only. */}
          <div className={cn("mb-8", panel && "lg:hidden")}>
            <BrandLock />
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