import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SwitchProps extends Omit<ComponentProps<"input">, "type" | "role"> {
  label?: ReactNode;
}

export function Switch({ className, label, id, ...props }: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      data-slot="switch"
      className={cn(
        "inline-flex cursor-pointer items-center gap-3 select-none",
        "has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        id={inputId}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full bg-input transition-colors duration-200",
          "peer-checked:bg-primary",
          "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40",
          "before:absolute before:left-0.5 before:top-0.5 before:size-5 before:rounded-full before:bg-white before:shadow-sm before:transition-transform before:duration-200 before:content-['']",
          "peer-checked:before:translate-x-5",
        )}
      />
      {label && <span className="text-sm font-medium">{label}</span>}
    </label>
  );
}
