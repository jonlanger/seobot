import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Internal hook used by form controls to inherit the id / aria wiring
 * provided by <Field>. Returns null when the control is standalone.
 */
export function useField() {
  return useContext(FieldContext);
}

export interface FieldProps {
  label?: ReactNode;
  /** Helper text below the control. Hidden while an error is shown. */
  hint?: ReactNode;
  /** Error message. Marks the control as invalid via aria-invalid. */
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Form field wrapper: label + control + hint/error, with automatic
 * id / aria-describedby / aria-invalid wiring for the control inside.
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div data-slot="field" className={cn("grid gap-2", className)}>
        {label && <Label htmlFor={id}>{label}</Label>}
        {children}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-destructive-soft-foreground">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
