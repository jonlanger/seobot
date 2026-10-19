import { useCallback, useEffect, useState } from "react";
import type { SiteClassification } from "@/content/top-sites";
import { EMPTY_FILTERS, toggleFacet, toggleValue } from "./crossfilter";
import type { LayoutMode, SiteFilters } from "./crossfilter";

const LAYOUTS: LayoutMode[] = ["rank", "vertical", "outcome", "metric"];
/** Facet selections live in `f.<facetId>=a,b` params. */
const FACET_PREFIX = "f.";
function facetsFromParams(params: URLSearchParams): Record<string, string[]> {
  const facets: Record<string, string[]> = {};
  for (const [key, value] of params) {
    if (key.startsWith(FACET_PREFIX) && value) facets[key.slice(FACET_PREFIX.length)] = list(value);
  }
  return facets;
}
const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

/** Filter + layout state, mirrored to the query string so a view is a shareable link. */
export function useSiteFilters() {
  const [filters, setFilters] = useState<SiteFilters>(EMPTY_FILTERS);
  const [layout, setLayout] = useState<LayoutMode>("rank");
  /** Which numeric metric the "metric" layout plots; null → the first available. */
  const [metricId, setMetricId] = useState<string | null>(null);
  // State, not a ref: the write effect must wait for the render that carries the hydrated values,
  // otherwise it runs once with empty state and wipes the URL before it is re-read (dev double-mount).
  const [hydrated, setHydrated] = useState(false);

  // Read the URL after mount (not in the initializer) so server and first client render match.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      query: params.get("q") ?? "",
      groups: list(params.get("v")),
      blockedBy: list(params.get("bl")),
      classes: list(params.get("c")) as SiteClassification[],
      bands: list(params.get("b")).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 9),
      facets: facetsFromParams(params),
    });
    // `l=inner` was the pre-metric name for inner-page coverage; keep old links working.
    const l = params.get("l") === "inner" ? "metric" : (params.get("l") as LayoutMode | null);
    if (l && LAYOUTS.includes(l)) setLayout(l);
    setMetricId(params.get("m") ?? (params.get("l") === "inner" ? "inner" : null));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const put = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
    put("q", filters.query.trim());
    put("v", filters.groups.join(","));
    put("bl", filters.blockedBy.join(","));
    put("c", filters.classes.join(","));
    put("b", filters.bands.join(","));
    for (const key of [...params.keys()]) if (key.startsWith(FACET_PREFIX)) params.delete(key);
    for (const [id, ids] of Object.entries(filters.facets)) put(FACET_PREFIX + id, ids.join(","));
    put("l", layout === "rank" ? "" : layout);
    put("m", layout === "metric" && metricId ? metricId : "");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [hydrated, filters, layout, metricId]);

  const toggle = useCallback(<K extends Exclude<keyof SiteFilters, "query" | "facets">>(key: K, value: SiteFilters[K][number]) => {
    setFilters((current) => ({ ...current, [key]: toggleValue(current[key] as unknown[], value) }));
  }, []);

  const toggleFacetOption = useCallback(
    (facetId: string, optionId: string) => setFilters((current) => toggleFacet(current, facetId, optionId)),
    [],
  );

  const setQuery = useCallback((query: string) => setFilters((current) => ({ ...current, query })), []);
  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return { filters, setFilters, toggle, toggleFacet: toggleFacetOption, setQuery, reset, layout, setLayout, metricId, setMetricId };
}
