/**
 * Shared frame for the unauthenticated credential screens.
 *
 * Sign-in, sign-up and password recovery all render through these so the
 * recovery flow cannot drift away from the sign-in flow it sits beside.
 */
import type { InputHTMLAttributes, ReactNode } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthCard({
  heading,
  children,
  footer,
}: {
  heading: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 py-8">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-2xl font-semibold tracking-tight mb-1">
          Orgni
        </Link>
        <p className="text-sm text-muted-foreground mb-8">{heading}</p>
        {children}
        {footer && <div className="text-sm text-muted-foreground mt-6">{footer}</div>}
      </div>
    </div>
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

export function FormError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm text-red-500">
      {children}
    </p>
  );
}
