import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RadioProps extends Omit<ComponentProps<"input">, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export function Radio({ className, label, description, id, ...props }: RadioProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      data-slot="radio"
      className={cn(
        "group/radio flex cursor-pointer items-start gap-2.5 select-none",
        "has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
    >
      <span className="relative mt-0.5 inline-flex">
        <input type="radio" id={inputId} className="peer sr-only" {...props} />
        <span
          aria-hidden
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-full border border-input bg-surface shadow-2xs transition-[border,border-width] duration-150",
            "peer-checked:border-[5.5px] peer-checked:border-primary",
            "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40",
          )}
        />
      </span>
      {(label || description) && (
        <span className="grid gap-0.5 leading-snug">
          {label && <span className="text-sm font-medium">{label}</span>}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
    </label>
  );
}

export interface RadioGroupProps extends ComponentProps<"fieldset"> {
  label?: ReactNode;
}

export function RadioGroup({ label, className, children, ...props }: RadioGroupProps) {
  return (
    <fieldset data-slot="radio-group" className={cn("grid gap-3", className)} {...props}>
      {label && <legend className="mb-1 text-sm font-medium">{label}</legend>}
      {children}
    </fieldset>
  );
}
