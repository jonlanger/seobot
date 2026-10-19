import { Logo } from "@/components/logo";

/**
 * Text-only by decision (2026-10-16): the footer ships no links until there
 * are real destinations to point them at. When pages land, add them here —
 * and only here (never placeholder `href="#"` links).
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-row flex-wrap items-center justify-between gap-6 py-14 sm:py-16">
        <Logo />
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          SEO data for Google rankings and AI citations — researched, sourced,
          and verified.
        </p>
        <p className="text-sm text-muted-foreground">
          © 2026 Seobot, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
