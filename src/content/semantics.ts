/**
 * Semantic HTML / page-structure / IA audit — first-party study.
 *
 * Derived artifact: `data/semantics-study.json`, produced by
 * `tools/crawl/semantics-audit.mjs` (59 pinned Tranco top-500 homepages,
 * raw fetch vs. headless Chromium). Never hand-edit the JSON — re-run the
 * crawler after a new audit.
 */
import raw from "./data/semantics-study.json";

export const semanticsStudy = raw;
export type SemanticsStudy = typeof raw;
