import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Side = "top" | "bottom" | "left" | "right";

const positions: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2 translate-y-0.5 group-hover/tooltip:translate-y-0",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2 -translate-y-0.5 group-hover/tooltip:translate-y-0",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2 translate-x-0.5 group-hover/tooltip:translate-x-0",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2 -translate-x-0.5 group-hover/tooltip:translate-x-0",
};

export interface TooltipProps {
  /** Tooltip text or content. */
  content: ReactNode;
  side?: Side;
  className?: string;
  children: ReactNode;
}

/**
 * Lightweight CSS-only tooltip. Shows on hover and keyboard focus.
 * For rich interactive content use DropdownMenu or Dialog instead.
 */
export function Tooltip({ content, side = "top", className, children }: TooltipProps) {
  return (
    <span data-slot="tooltip" className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md",
          "transition-[opacity,translate] duration-150",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          positions[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}
