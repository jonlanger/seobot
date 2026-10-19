import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import { cn } from "@/lib/cn";

interface MenuContextValue {
  close: () => void;
}

const MenuContext = createContext<MenuContextValue>({ close: () => {} });

/** Props injected into the trigger element by DropdownMenu. */
export interface DropdownMenuTriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  "aria-haspopup"?: "menu";
  "aria-expanded"?: boolean;
  "data-state"?: "open" | "closed";
  ref?: Ref<HTMLElement>;
}

export interface DropdownMenuProps {
  /**
   * Trigger element — typically a <Button> or a plain <button>. The menu
   * injects click/aria/ref behavior into it instead of wrapping it, so the
   * markup stays valid (no nested buttons).
   */
  trigger: ReactElement<DropdownMenuTriggerProps>;
  /** Alignment of the panel relative to the trigger. */
  align?: "start" | "end";
  /** Side of the trigger the panel opens on. Use "top" near the viewport bottom. */
  side?: "bottom" | "top";
  className?: string;
  /** Extra classes for the wrapper element. */
  rootClassName?: string;
  children: ReactNode;
}

export function DropdownMenu({
  trigger,
  align = "end",
  side = "bottom",
  className,
  rootClassName,
  children,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (items.length === 0) return;

    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "End") next = items.length - 1;

    items[next]?.focus();
    event.preventDefault();
  };

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        onClick: (event: MouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          setOpen((value) => !value);
        },
        "aria-haspopup": "menu" as const,
        "aria-expanded": open,
        "data-state": open ? ("open" as const) : ("closed" as const),
        ref: triggerRef,
      })
    : trigger;

  return (
    <div
      ref={rootRef}
      data-slot="dropdown-menu"
      className={cn("relative inline-flex", rootClassName)}
    >
      {triggerElement}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          data-slot="dropdown-menu-panel"
          onKeyDown={handlePanelKeyDown}
          className={cn(
            "absolute z-50 min-w-44 rounded-xl border border-border bg-surface p-1.5 shadow-lg",
            side === "top" ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top",
            "animate-fade-in",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>
            {children}
          </MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

export interface DropdownMenuItemProps extends ComponentProps<"button"> {
  /** Style the item as a dangerous action. */
  destructive?: boolean;
  inset?: boolean;
}

export function DropdownMenuItem({
  className,
  destructive = false,
  inset = false,
  onClick,
  children,
  ...props
}: DropdownMenuItemProps) {
  const { close } = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        "outline-none focus-visible:bg-accent hover:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-muted-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        destructive &&
          "text-destructive-soft-foreground [&_svg]:text-destructive-soft-foreground hover:bg-destructive-soft focus-visible:bg-destructive-soft",
        inset && "pl-9",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto font-mono text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
}
