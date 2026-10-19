/**
 * Cross-source domain enrichment for the Tranco top-sites study.
 *
 * Each source is optional and populated by a script in `scripts/`:
 *   - umbrella-ranks.json      <- scripts/pull-umbrella.mjs (no key needed)
 *   - crux-cwv.json           <- scripts/pull-crux.mjs (CRUX_API_KEY)
 *   - openpagerank.json       <- scripts/pull-openpagerank.mjs (OPENPAGERANK_API_KEY)
 *
 * A missing/empty source simply yields nulls — the dashboard renders what it has.
 */
import umbrellaRaw from "./data/umbrella-ranks.json";
import cruxRaw from "./data/crux-cwv.json";
import oprRaw from "./data/openpagerank.json";

export interface UmbrellaRank {
  domain: string;
  trancoRank: number;
  umbrellaRank: number | null;
}

export interface CruxCwv {
  domain: string;
  lcpP75: number | null;
  clsP75: number | null;
  inpP75: number | null;
  status: number;
}

export interface OpenPageRank {
  domain: string;
  pageRankDecimal: number | null;
  rank: number | null;
}

export interface DomainEnrichment {
  domain: string;
  trancoRank: number;
  umbrellaRank: number | null;
  crux: CruxCwv | null;
  openPageRank: OpenPageRank | null;
}

const umbrellaByDomain = new Map<string, UmbrellaRank>(
  (umbrellaRaw as { rows: UmbrellaRank[] }).rows.map((r) => [r.domain, r]),
);
const cruxByDomain = new Map<string, CruxCwv>(
  (cruxRaw as { rows: CruxCwv[] }).rows.map((r) => [r.domain, r]),
);
const oprByDomain = new Map<string, OpenPageRank>(
  (oprRaw as { rows: OpenPageRank[] }).rows.map((r) => [r.domain, r]),
);

export const enrichmentSources = {
  umbrella: (umbrellaRaw as { pulledAt: string | null }).pulledAt,
  crux: (cruxRaw as { pulledAt: string | null }).pulledAt,
  openPageRank: (oprRaw as { pulledAt: string | null }).pulledAt,
};

export function enrichmentFor(domain: string, trancoRank: number): DomainEnrichment {
  return {
    domain,
    trancoRank,
    umbrellaRank: umbrellaByDomain.get(domain)?.umbrellaRank ?? null,
    crux: cruxByDomain.get(domain) ?? null,
    openPageRank: oprByDomain.get(domain) ?? null,
  };
}

export const enrichmentRows: DomainEnrichment[] = (umbrellaRaw as { rows: UmbrellaRank[] }).rows.map((r) =>
  enrichmentFor(r.domain, r.trancoRank),
);
