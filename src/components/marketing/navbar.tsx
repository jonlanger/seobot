import { LayoutDashboard, Menu, SearchCheck, X } from "lucide-react";
import { useState } from "react";
import type { MouseEvent } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
import { demoHref } from "@/lib/demo-links";

/**
 * Anchors are absolute (`/#features`) so they resolve from every view — the
 * SEO Check page renders this navbar too, and "/" + "#" both walk back to the
 * landing page. On the landing page they are plain hash links (native scroll,
 * middle-click, and crawlers all work). From another view the harness passes
 * `onSectionLink` to intercept the click: switch back to the landing view,
 * then scroll to the section — no reload.
 */
const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "AI visibility", href: "/#ai-search" },
  { label: "FAQ", href: "/#faq" },
];

export function Navbar({
  className,
  onHome,
  onRunSeoCheck,
  onOpenDashboard,
  onSectionLink,
  showCta = true,
}: {
  className?: string;
  /** Demo hook: returns to the landing view without a full reload. */
  onHome?: () => void;
  /** Demo hook: opens the free SEO Check view (the marketing site's growth-loop tool). */
  onRunSeoCheck?: () => void;
  /** Demo hook: opens the research dashboard without a full reload. */
  onOpenDashboard?: () => void;
  /** Demo hook: resolves an in-page anchor ("/#features") from another view without a reload. */
  onSectionLink?: (href: string) => void;
  /** The SEO Check page hides the CTA — you're already there. */
  showCta?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Real links first: hrefs work without JS (middle-click, crawlers, no harness).
  // When the demo harness passes a handler, intercept for an instant view switch.
  const intercept = (handler?: () => void) =>
    handler
      ? (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          handler();
        }
      : undefined;

  const sectionClick = (href: string) =>
    onSectionLink
      ? (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          onSectionLink(href);
        }
      : undefined;

  const dashboard = (
    <a
      href={demoHref("/dashboard")}
      onClick={intercept(onOpenDashboard)}
      className={buttonVariants({ size: "sm" })}
    >
      <LayoutDashboard className="size-4" />
      View Data
    </a>
  );

  const cta = (
    <a
      href={demoHref("/seo-check")}
      onClick={intercept(onRunSeoCheck)}
      className={buttonVariants({ variant: "secondary", size: "sm" })}
    >
      <SearchCheck className="size-4" />
      Run a free SEO check
    </a>
  );

  return (
    <header
      data-slot="navbar"
      className={cn(
        "sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md",
        className,
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-6">
        <a
          href="/"
          onClick={intercept(onHome)}
          aria-label="Seobot home"
          className="rounded-lg focus-ring"
        >
          <Logo />
        </a>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={sectionClick(link.href)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {dashboard}
          {showCta && cta}
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <nav aria-label="Mobile" className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => {
                  setOpen(false);
                  sectionClick(link.href)?.(event);
                }}
                className="rounded-lg px-3 py-2.5 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={demoHref("/dashboard")}
                onClick={(event) => {
                  setOpen(false);
                  intercept(onOpenDashboard)?.(event);
                }}
                className={buttonVariants()}
              >
                <LayoutDashboard className="size-4" />
                View Data
              </a>
              {showCta && (
                <a
                  href={demoHref("/seo-check")}
                  onClick={(event) => {
                    setOpen(false);
                    intercept(onRunSeoCheck)?.(event);
                  }}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  <SearchCheck className="size-4" />
                  Run a free SEO check
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
