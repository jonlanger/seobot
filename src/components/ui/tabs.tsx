import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { createContext, useContext, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------- Primitives ------------------------------- */

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used inside <Tabs>.");
  return context;
}

export interface TabsProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** Controlled active tab value. */
  value?: string;
  /** Initial tab value when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  const setValue = (next: string) => {
    if (next === current) return;
    setInternal(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/* --------------------------------- TabsList -------------------------------- */

const tabsListVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      pill: "gap-1 rounded-lg bg-muted p-1",
      underline: "gap-6 border-b border-border",
    },
  },
  defaultVariants: {
    variant: "pill",
  },
});

type TabListVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;

const TabsListContext = createContext<TabListVariant>("pill");

export interface TabsListProps
  extends ComponentProps<"div">,
    VariantProps<typeof tabsListVariants> {}

export function TabsList({ className, variant, onKeyDown, children, ...props }: TabsListProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return;

    const tabs = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)') ?? [],
    );
    if (tabs.length === 0) return;

    const index = tabs.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    tabs[(index + delta + tabs.length) % tabs.length]?.focus();
    event.preventDefault();
  };

  return (
    <TabsListContext.Provider value={variant ?? "pill"}>
      <div
        ref={ref}
        role="tablist"
        data-slot="tabs-list"
        className={cn(tabsListVariants({ variant }), className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    </TabsListContext.Provider>
  );
}

/* ------------------------------- TabsTrigger ------------------------------- */

const triggerBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4";

const triggerVariants: Record<TabListVariant, string> = {
  pill: cn(
    "h-8 rounded-md px-3 text-sm text-muted-foreground",
    "hover:text-foreground",
    "data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-xs",
  ),
  underline: cn(
    "-mb-px border-b-2 border-transparent px-0.5 pb-3 pt-1 text-sm text-muted-foreground",
    "hover:border-border hover:text-foreground",
    "data-[state=active]:border-primary data-[state=active]:text-foreground",
  ),
};

export interface TabsTriggerProps extends ComponentProps<"button"> {
  value: string;
}

export function TabsTrigger({ value, className, onClick, children, ...props }: TabsTriggerProps) {
  const { value: current, setValue } = useTabsContext();
  const listVariant = useContext(TabsListContext);
  const active = current === value;

  return (
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      data-state={active ? "active" : "inactive"}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={(event) => {
        onClick?.(event);
        setValue(value);
      }}
      className={cn(triggerBase, triggerVariants[listVariant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------- TabsContent ------------------------------- */

export interface TabsContentProps extends ComponentProps<"div"> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: current } = useTabsContext();
  if (current !== value) return null;

  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}
