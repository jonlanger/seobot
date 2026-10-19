import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Sticky translucent top bar used above app content. */
export function AppTopbar({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="app-topbar"
      className={cn(
        "sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
