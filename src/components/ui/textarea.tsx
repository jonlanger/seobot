import type { ComponentProps } from "react";
import { useField } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const field = useField();
  const {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    ...rest
  } = props;

  return (
    <textarea
      data-slot="textarea"
      id={id ?? field?.id}
      aria-describedby={describedBy ?? field?.describedBy}
      aria-invalid={invalid ?? (field?.invalid || undefined)}
      className={cn(
        "field-sizing-content min-h-24 w-full resize-none rounded-lg border border-input bg-surface px-3.5 py-2.5 text-sm shadow-2xs",
        "transition-[color,box-shadow,border-color] outline-none",
        "placeholder:text-muted-foreground/75",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35",
        className,
      )}
      {...rest}
    />
  );
}
