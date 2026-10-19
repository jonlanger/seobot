import { topSitesStudy } from "@/content/top-sites";
import type { StudySite } from "@/content/top-sites";

/** Shared matrix derivations for the dashboard's 2D/3D views and the home hero. */

export const CRAWLERS = topSitesStudy.meta.crawlers;

export const VERTICALS = [...new Set(topSitesStudy.sites.map((s) => s.group).filter(Boolean))] as string[];

export function shortVertical(v: string): string {
  return v
    .replace(" & media", "")
    .replace(" & education", "")
    .replace(" & entertainment", "")
    .replace(" & dev", "")
    .replace("E-commerce", "Commerce");
}

export interface BlockRateCell {
  count: number;
  total: number;
  /** Percent of the vertical's sites matching the metric (0–100). */
  pct: number;
  sites: StudySite[];
}

/** `[crawler][vertical]` share of sites that block (or allow) each crawler. */
export function blockRateMatrix(metric: "block" | "allow"): BlockRateCell[][] {
  return CRAWLERS.map((crawler) =>
    VERTICALS.map((v) => {
      const inVertical = topSitesStudy.sites.filter((s) => s.group === v);
      const sites = inVertical.filter((s) => s.robots.verdicts[crawler] === metric);
      return { count: sites.length, total: inVertical.length, pct: inVertical.length ? (sites.length / inVertical.length) * 100 : 0, sites };
    }),
  );
}
