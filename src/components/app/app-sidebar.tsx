import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface NavItem {
  label: string;
  /**
   * Real destination. Omit while no route exists — the item renders as an
   * inert button instead of a dead link (never placeholder `href="#"`).
   */
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface AppSidebarProps extends ComponentProps<"aside"> {
  sections: NavSection[];
  /** Rendered at the top (typically the logo). */
  header?: ReactNode;
  /** Rendered at the bottom (typically the user card). */
  footer?: ReactNode;
  /** When true, only icons are shown and labels are hidden. */
  collapsed?: boolean;
}

/**
 * One navigation row: a real link when the item has a destination, an inert
 * button otherwise — placeholder `href="#"` links are never shipped.
 */
export function AppNavItem({
  item,
  className,
  collapsed,
  /** Called on activation — used to close the mobile navigation dialog. */
  onSelect,
}: {
  item: NavItem;
  className?: string;
  collapsed?: boolean;
  onSelect?: () => void;
}) {
  const shared = {
    "aria-current": item.active ? ("page" as const) : undefined,
    className,
    onClick: () => {
      item.onClick?.();
      onSelect?.();
    },
  };

  return item.href ? (
    <a href={item.href} {...shared}>
      {item.icon}
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge}
    </a>
  ) : (
    // `w-full` — buttons size to their content by default, anchors fill the row.
    <button type="button" {...shared} className={cn(shared.className, "w-full")}>
      {item.icon}
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge}
    </button>
  );
}

export function AppSidebar({
  sections,
  header,
  footer,
  collapsed,
  className,
  ...props
}: AppSidebarProps) {
  return (
    <aside
      data-slot="app-sidebar"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface transition-all duration-200",
        collapsed ? "w-14" : "w-64",
        className,
      )}
      {...props}
    >
      {header && (
        <div className={cn(
          "flex h-16 shrink-0 items-center border-b border-border px-5",
          collapsed ? "justify-center px-2" : ""
        )}>
          {header}
        </div>
      )}

      <nav aria-label="Main navigation" className={cn(
        "flex-1 overflow-y-auto",
        collapsed ? "px-2 py-4" : "px-3 py-4"
      )}>
        {sections.map((section, index) => (
          <div key={section.label ?? index} className={cn(index > 0 && "mt-6")}>
            {!collapsed && section.label && (
              <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
                {section.label}
              </div>
            )}
            <ul className="grid gap-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <AppNavItem
                    item={item}
                    collapsed={collapsed}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-left text-sm transition-colors",
                      collapsed ? "justify-center gap-0 px-0 py-2" : "px-2 py-2",
                      "[&_svg:not([class*='size-'])]:size-4.5 [&_svg]:shrink-0",
                      item.active
                        ? "bg-primary-soft font-medium text-primary-soft-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
    </aside>
  );
}
