/**
 * Route table — the single source of truth for URL ↔ view.
 *
 * Real History API paths (docs/seo-research.md §2.2: never hash or query
 * routes for indexable pages). `prerender` routes are rendered to static HTML
 * at build time (`scripts/prerender.mjs`); the rest are client-rendered
 * reference or dynamic views served through the host's SPA rewrite.
 */
export type View =
  | "landing"
  | "dashboard"
  | "seo-check"
  | "semantics-study"
  | "company"
  | "components"
  | "foundations"
  | "brand"
  | "not-found";

export interface RouteDef {
  view: Exclude<View, "company" | "not-found">;
  path: string;
  /** Rendered to static HTML at build time and listed in sitemap.xml. */
  prerender: boolean;
}

export const routes: RouteDef[] = [
  { view: "landing", path: "/", prerender: true },
  { view: "seo-check", path: "/seo-check", prerender: true },
  { view: "dashboard", path: "/dashboard", prerender: true },
  { view: "semantics-study", path: "/research/semantics", prerender: true },
  { view: "components", path: "/design/components", prerender: false },
  { view: "foundations", path: "/design/foundations", prerender: false },
  { view: "brand", path: "/design/brand", prerender: false },
];

export const COMPANY_PREFIX = "/company/";

export interface Location {
  view: View;
  /** Only set for the company view. */
  domain: string;
}

export function locationFromPath(pathname: string): Location {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const match = routes.find((route) => route.path === clean);
  if (match) return { view: match.view, domain: "" };
  if (clean.startsWith(COMPANY_PREFIX) && clean.length > COMPANY_PREFIX.length) {
    return { view: "company", domain: decodeURIComponent(clean.slice(COMPANY_PREFIX.length)) };
  }
  return { view: "not-found", domain: "" };
}

export function pathForView(view: View, domain = ""): string {
  if (view === "company") return `${COMPANY_PREFIX}${encodeURIComponent(domain)}`;
  return routes.find((route) => route.view === view)?.path ?? "/";
}

/** Old `?view=` deep links, kept alive by a redirect in index.html. */
export const legacyViewPaths: Record<string, string> = Object.fromEntries(
  routes.map((route) => [route.view, route.path]).concat([["company", COMPANY_PREFIX]]),
);
