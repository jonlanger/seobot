import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { DropdownMenu, DropdownMenuItem } from "./dropdown-menu";

export interface SelectMenuOption {
  value: string;
  label: string;
}

export interface SelectMenuProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectMenuOption[];
  /** Accessible name for the trigger. */
  "aria-label": string;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}

/**
 * A single-choice menu that looks and behaves like the design system's other menus.
 * Use it in place of the native `<select>` where the open list should match the UI
 * (the native `Select` stays for forms, where the platform picker is the right call).
 * Built on `DropdownMenu`, so it inherits Escape, outside-click and arrow-key handling.
 */
export function SelectMenu({
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
  align = "start",
  side = "bottom",
  className,
}: SelectMenuProps) {
  const current = options.find((option) => option.value === value);
  return (
    <DropdownMenu
      align={align}
      side={side}
      rootClassName={cn("w-full", className)}
      className="w-full min-w-max"
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "relative h-10 w-full rounded-lg border border-input bg-surface px-3.5 pr-10 text-left text-sm shadow-2xs",
            "transition-[color,box-shadow,border-color] outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
            "data-[state=open]:border-ring",
          )}
        >
          <span className="block truncate">{current?.label ?? "Select…"}</span>
          <ChevronsUpDown
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </button>
      }
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <DropdownMenuItem
            key={option.value}
            aria-current={selected ? "true" : undefined}
            onClick={() => onValueChange(option.value)}
            className={cn(selected && "font-medium")}
          >
            <span className="grid size-4 shrink-0 place-items-center">
              {selected && <Check className="size-4 text-primary" aria-hidden />}
            </span>
            {option.label}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenu>
  );
}
