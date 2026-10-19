import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Input } from "./input";

export interface CollapsibleSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name for the field and for the collapsed button. */
  "aria-label": string;
  /** Whether the narrow-width field is expanded. Controlled so the parent can hide siblings while it is. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Width classes for the always-visible field at wide container sizes, e.g. `@md:w-44 @xl:w-64`. */
  inlineClassName?: string;
  className?: string;
}

/**
 * A search that adapts to the space it has. Wide: a normal field. Narrow: an icon button that
 * expands into the field (taking over its row, so the parent can hide neighbouring controls) and
 * collapses again when the user clears it, presses Enter or Escape, or leaves it. A dot on the
 * collapsed button shows a search is still applied.
 *
 * Responds to its nearest `@container` ancestor (Tailwind container queries), not the viewport —
 * the right measure when sidebars decide how much room a toolbar really has.
 */
export function CollapsibleSearch({
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
  open,
  onOpenChange,
  inlineClassName,
  className,
}: CollapsibleSearchProps) {
  return (
    <>
      <div className={cn("hidden @md:block", inlineClassName, className)}>
        <Input
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          leading={<Search className="size-4" />}
        />
      </div>

      <div className={cn("@md:hidden", open && "min-w-0 flex-1")}>
        {open ? (
          <Input
            autoFocus
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onBlur={() => onOpenChange(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") onOpenChange(false);
            }}
            placeholder={placeholder}
            aria-label={ariaLabel}
            leading={<Search className="size-4" />}
            trailing={
              <button
                type="button"
                aria-label="Clear search"
                // Keep focus in the field so the blur handler doesn't collapse it before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onValueChange("");
                  onOpenChange(false);
                }}
                className="grid size-6 place-items-center rounded-md transition-colors hover:text-foreground focus-ring"
              >
                <X className="size-4" />
              </button>
            }
          />
        ) : (
          <Button
            variant="secondary"
            size="icon"
            aria-label={value ? `${ariaLabel}: “${value}”` : ariaLabel}
            onClick={() => onOpenChange(true)}
            className="relative"
          >
            <Search />
            {value && <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />}
          </Button>
        )}
      </div>
    </>
  );
}
