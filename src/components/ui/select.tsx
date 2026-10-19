import { ChevronsUpDown } from "lucide-react";
import type { ComponentProps } from "react";
import { useField } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  const field = useField();
  const {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    ...rest
  } = props;

  return (
    <div data-slot="select-wrapper" className="relative w-full">
      <select
        data-slot="select"
        id={id ?? field?.id}
        aria-describedby={describedBy ?? field?.describedBy}
        aria-invalid={invalid ?? (field?.invalid || undefined)}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-surface px-3.5 pr-10 text-sm shadow-2xs",
          "transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronsUpDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
