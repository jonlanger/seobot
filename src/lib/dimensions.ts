import type { StudySite } from "@/content/top-sites";
import { metricFraction } from "./crossfilter";
import type { NumericMetric } from "./crossfilter";

/**
 * A per-site number the 3D explorer can put on the depth (Z) axis or map to
 * sphere size. `fraction` is value-ordered: 0 is the low end, 1 the high end.
 */
export interface Dimension {
  id: string;
  label: string;
  /** Short phrase for captions: "sphere size is …". */
  description: string;
  lowLabel: string;
  highLabel: string;
  /** 0–1, or null when the site has no value. */
  fraction: (site: StudySite) => number | null;
  /** Hover-card text, or null when the site has no value. */
  format: (site: StudySite) => string | null;
}

export const NO_DIMENSION = "none";

const WORDS_MIN = 20;
const WORDS_MAX = 200_000;

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Built-ins plus every numeric metric. Rank is inverted so "more" always means "more popular". */
export function buildDimensions(sites: StudySite[], metrics: NumericMetric[]): Dimension[] {
  const maxRank = Math.max(2, ...sites.map((site) => site.rank));
  return [
    {
      id: "rank",
      label: "Popularity (Tranco rank)",
      description: "popularity — bigger is a higher Tranco rank",
      lowLabel: `#${maxRank.toLocaleString()}`,
      highLabel: "#1",
      fraction: (site) => 1 - Math.log(site.rank) / Math.log(maxRank),
      format: (site) => `#${site.rank.toLocaleString()}`,
    },
    {
      id: "words",
      label: "Page size (rendered words)",
      description: "rendered words on the homepage (log scale)",
      lowLabel: `${WORDS_MIN} words`,
      highLabel: `${compact(WORDS_MAX)} words`,
      fraction: (site) => {
        const words = site.metrics?.renderedWords;
        if (!words) return null;
        const v = Math.min(WORDS_MAX, Math.max(WORDS_MIN, words));
        return (Math.log(v) - Math.log(WORDS_MIN)) / (Math.log(WORDS_MAX) - Math.log(WORDS_MIN));
      },
      format: (site) => (site.metrics ? `${site.metrics.renderedWords.toLocaleString()} words` : null),
    },
    ...metrics.map<Dimension>((metric) => ({
      id: `m:${metric.id}`,
      label: metric.label,
      description: metric.description,
      lowLabel: metric.ticks[0]?.label ?? "low",
      highLabel: metric.ticks[metric.ticks.length - 1]?.label ?? "high",
      fraction: (site) => {
        const value = metric.values.get(site.domain);
        return value === undefined ? null : metricFraction(metric, value);
      },
      format: (site) => {
        const value = metric.values.get(site.domain);
        return value === undefined ? null : metric.format(value);
      },
    })),
  ];
}
