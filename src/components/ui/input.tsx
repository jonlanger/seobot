import type { ComponentProps, ReactNode } from "react";
import { useField } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export interface InputProps extends ComponentProps<"input"> {
  /** Decorative element rendered inside the field, before the text. */
  leading?: ReactNode;
  /** Interactive element rendered inside the field, after the text. */
  trailing?: ReactNode;
}

export function Input({ className, leading, trailing, ...props }: InputProps) {
  const field = useField();
  const {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    ...rest
  } = props;

  const input = (
    <input
      data-slot="input"
      id={id ?? field?.id}
      aria-describedby={describedBy ?? field?.describedBy}
      aria-invalid={invalid ?? (field?.invalid || undefined)}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-surface px-3.5 py-2 text-sm shadow-2xs",
        "transition-[color,box-shadow,border-color] outline-none",
        "placeholder:text-muted-foreground/75",
        "selection:bg-primary-soft selection:text-primary-soft-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35",
        leading ? "pl-10" : undefined,
        trailing ? "pr-10" : undefined,
        className,
      )}
      {...rest}
    />
  );

  if (!leading && !trailing) return input;

  return (
    <div data-slot="input-wrapper" className="relative w-full">
      {leading && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg:not([class*='size-'])]:size-4"
        >
          {leading}
        </span>
      )}
      {input}
      {trailing && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {trailing}
        </span>
      )}
    </div>
  );
}
