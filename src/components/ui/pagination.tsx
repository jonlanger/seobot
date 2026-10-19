import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export interface PaginationProps extends Omit<ComponentProps<"nav">, "onChange"> {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Left-hand summary, e.g. "Showing 1–36 of 1,700". */
  summary?: ReactNode;
}

/** Previous / next with a "Page x / y" indicator and an optional summary on the left. */
export function Pagination({ page, pageCount, onPageChange, summary, className, ...props }: PaginationProps) {
  const current = Math.min(Math.max(1, page), pageCount);
  return (
    <nav
      data-slot="pagination"
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      {...props}
    >
      <span className="numeric text-xs text-muted-foreground">{summary}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="numeric px-2 font-mono text-xs">
          Page {current} / {pageCount}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next page"
          disabled={current >= pageCount}
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
