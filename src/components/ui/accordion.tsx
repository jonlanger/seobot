import { ChevronDown } from "lucide-react";
import { createContext, useContext, useId, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AccordionContextValue {
  openItem: string | null;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used inside <Accordion>.");
  return context;
}

export interface AccordionProps extends Omit<ComponentProps<"div">, "defaultValue"> {
  /** Item value open by default. */
  defaultValue?: string | null;
  /** Allow closing the open item by clicking it again. */
  collapsible?: boolean;
}

export function Accordion({
  defaultValue = null,
  collapsible = true,
  className,
  children,
  ...props
}: AccordionProps) {
  const [openItem, setOpenItem] = useState<string | null>(defaultValue);

  const toggle = (value: string) => {
    setOpenItem((current) => {
      if (current === value) return collapsible ? null : current;
      return value;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItem, toggle }}>
      <div data-slot="accordion" className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps extends Omit<ComponentProps<"div">, "title"> {
  value: string;
  title: ReactNode;
}

export function AccordionItem({
  value,
  title,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { openItem, toggle } = useAccordion();
  const open = openItem === value;
  const contentId = useId();
  const triggerId = `${contentId}-trigger`;

  return (
    <div
      data-slot="accordion-item"
      data-state={open ? "open" : "closed"}
      className={cn("group border-b border-border last:border-b-0", className)}
      {...props}
    >
      <h3>
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => toggle(value)}
          className="flex w-full items-center justify-between gap-4 rounded-md py-5 text-left text-base font-medium tracking-tight transition-colors focus-ring hover:text-primary-soft-foreground"
        >
          {title}
          <ChevronDown
            aria-hidden
            className="size-4.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}
