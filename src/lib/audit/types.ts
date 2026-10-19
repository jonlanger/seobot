/**
 * Assessment engine types — the on-site "SEO Check" (docs/seo-check.md).
 *
 * Design rule: this engine is evidence-source agnostic. Today the evidence is
 * questionnaire answers; the automated audit (P1) feeds crawl / Search Console
 * evidence into the same rule ids, scoring, and report. Keep this file free of
 * UI and copy — labels and wording live in `src/content/seo-check.ts`.
 */

/** A visitor's answer to one question. */
export type Answer = "yes" | "unsure" | "no";

export type SiteType = "saas" | "ecommerce" | "local" | "publisher" | "other";

export type CategoryId =
  | "setup"
  | "indexability"
  | "content"
  | "authority"
  | "experience"
  | "geo"
  | "trust";

export type Effort = "quick" | "moderate" | "involved";

/** How much of the score rests on guesses vs firm answers. */
export type Confidence = "high" | "medium" | "low";

export type PriorityBand = "now" | "month" | "later";

/** Minimum shape the engine needs from a catalog question. */
export interface AssessableQuestion {
  /** Rule id, shared with the automated engine's catalog (docs/audit-engine.md §6). */
  id: string;
  category: CategoryId;
  /** 1 (nice-to-have) – 5 (critical). Mirrors the automated catalog's severity. */
  severity: 1 | 2 | 3 | 4 | 5;
  effort: Effort;
}

export interface CategoryScore {
  id: CategoryId;
  label: string;
  /** 0–100, severity-weighted mean of the category's answers. */
  score: number;
  /** Profile weight in percent (see PROFILE_WEIGHTS). */
  weight: number;
  answered: number;
  total: number;
}

export interface AssessmentFinding {
  /** Question that produced this finding. */
  questionId: string;
  /** "no" → fix task; "unsure" → verify task. */
  kind: "fix" | "verify";
  category: CategoryId;
  severity: number;
  effort: Effort;
  band: PriorityBand;
  /** Sort key: severity × 2 − effort penalty + gated-layer boost. */
  priority: number;
}

/** Answer counts across the assessed questions — the report's answer mix. */
export interface AnswerBreakdown {
  yes: number;
  unsure: number;
  no: number;
}

export interface AssessmentResult {
  /** 0–100 overall score. */
  score: number;
  confidence: Confidence;
  /** Share of answers marked "not sure" (0–1). */
  unsureShare: number;
  /** One entry per category present in the question set, in report order. */
  categories: CategoryScore[];
  /** Sorted: band, then priority (desc), then severity (desc). */
  findings: AssessmentFinding[];
  /** Answer counts — sums to `answered`. */
  breakdown: AnswerBreakdown;
  answered: number;
  total: number;
}
