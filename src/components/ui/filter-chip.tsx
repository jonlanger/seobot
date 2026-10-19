import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./badge";

export interface FilterChipProps extends Omit<ComponentProps<"span">, "onClick"> {
  onRemove: () => void;
}

/** An applied filter: a primary badge with its own remove control. */
export function FilterChip({ onRemove, className, children, ...props }: FilterChipProps) {
  return (
    <Badge variant="primary" className={cn("gap-1 pr-1 motion-safe:animate-fade-in", className)} {...props}>
      {children}
      <button
        type="button"
        aria-label={`Remove filter: ${typeof children === "string" ? children : "filter"}`}
        onClick={onRemove}
        className="grid size-4 place-items-center rounded-full transition-colors hover:bg-primary/15 focus-ring"
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
