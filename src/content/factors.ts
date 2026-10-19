/**
 * Ranking-factor measurements: the Atlas factors (research/data/factors.json) joined
 * to our site datasets — per measurable factor, how many sites pass. Produced by
 * `npm run data:factor-measurements`; never hand-edit the JSON.
 *
 * Every pass rate carries its own `n` (sites where the field was measured) and a
 * `kind`: "direct" tests the factor's own claim, "proxy" is a weaker stand-in whose
 * gap is stated in `caveat`. UI must show both wherever a percentage appears.
 */
import raw from "./data/factor-measurements.json";

export interface PassBand {
  n: number;
  pass: number;
  passPct: number;
}

export interface FactorMeasurement {
  id: string;
  label: string;
  kind: "direct" | "proxy";
  dataset: string;
  predicate: string;
  denominator: string;
  caveat: string | null;
  n: number;
  pass: number;
  passPct: number;
  byRankBand?: (PassBand & { band: string })[];
  byCdn?: (PassBand & { cdn: string })[];
}

export type FactorLayer = "discover" | "index" | "relevance" | "citation" | "authority" | "experience";

export interface Factor {
  factorId: string;
  label: string;
  layer: FactorLayer;
  stage: string;
  /** A gate factor can block visibility outright, regardless of the rest. */
  gate: boolean;
  confidence: "high" | "medium" | "low";
  surface: ("seo" | "geo")[];
  effort: string;
  measurements: FactorMeasurement[];
}

export interface CandidateFactor {
  id: string;
  label: string;
  dataset: string;
  n: number;
  pass: number;
  passPct: number;
}

export interface UnmeasuredFactor {
  factorId: string;
  label: string;
  layer: FactorLayer;
  why: string;
}

export interface FactorMeasurements {
  meta: {
    generatedAt: string;
    license: string;
    method: string;
    sitesCrawled: number;
    sitesMeasured: number;
    factorsMapped: number;
    factorsTotal: number;
  };
  factors: Factor[];
  candidateFactors: CandidateFactor[];
  notMeasurable: UnmeasuredFactor[];
}

export const factorMeasurements = raw as unknown as FactorMeasurements;

/** Pipeline order of the visibility layers, with a plain-language gloss. */
export const layerMeta: Record<FactorLayer, { label: string; blurb: string }> = {
  discover: { label: "Discover", blurb: "Can crawlers find and fetch the site at all?" },
  index: { label: "Index", blurb: "Does the content survive into the index as readable text?" },
  relevance: { label: "Relevance", blurb: "Does the page say clearly what it is about?" },
  citation: { label: "Citation", blurb: "Is the content structured so an engine can quote it?" },
  authority: { label: "Authority", blurb: "Do other sources vouch for the site? Mostly off-site, so mostly out of reach of a crawl." },
  experience: { label: "Experience", blurb: "Is the page fast and clean to use?" },
};

export const layerOrder: FactorLayer[] = ["discover", "index", "relevance", "citation", "authority", "experience"];

/** Layer label that survives a layer the factor list adds before this module learns about it. */
export function layerLabel(layer: string): string {
  return layerMeta[layer as FactorLayer]?.label ?? layer.charAt(0).toUpperCase() + layer.slice(1);
}
