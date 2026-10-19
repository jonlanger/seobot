import { Check } from "lucide-react";
import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ className, label, description, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      data-slot="checkbox"
      className={cn(
        "group/checkbox flex cursor-pointer items-start gap-2.5 select-none",
        "has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
    >
      <span className="relative mt-0.5 inline-flex">
        <input
          type="checkbox"
          id={inputId}
          className={cn(
            "peer size-[18px] shrink-0 appearance-none rounded-[5px] border border-input bg-surface shadow-2xs transition-colors",
            "checked:border-primary checked:bg-primary",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
            "disabled:cursor-not-allowed",
          )}
          {...props}
        />
        <Check
          aria-hidden
          strokeWidth={3.5}
          className="pointer-events-none absolute inset-0 m-auto size-3 scale-75 text-primary-foreground opacity-0 transition-[opacity,scale] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
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
