import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InfoPopoverProps {
  /** Accessible name for the trigger. */
  label: string;
  /** Explanation shown on hover and keyboard focus. */
  children: ReactNode;
  placement?: "below" | "above";
  align?: "start" | "end";
  className?: string;
}

/** An info icon that reveals longer explanatory text on hover or focus. */
export function InfoPopover({ label, children, placement = "below", align = "start", className }: InfoPopoverProps) {
  return (
    <span data-slot="info-popover" className={cn("group/info relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-ring"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-[min(24rem,80vw)] rounded-lg border border-border bg-surface p-3 text-left text-xs font-normal leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150",
          "group-hover/info:opacity-100 group-focus-within/info:opacity-100",
          placement === "below" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          align === "start" ? "left-0" : "right-0",
        )}
      >
        {children}
      </span>
    </span>
  );
}
