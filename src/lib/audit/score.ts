/**
 * Scoring engine for the on-site "SEO Check" (docs/seo-check.md §5).
 *
 * Pure functions over a catalog + answers — no UI, no data fetching, no
 * globals. The same math will score automated evidence in P1.
 *
 *   answer:      yes = 1 · not sure = 0.5 · no = 0
 *   category:    severity-weighted mean of its answers × 100
 *   overall:     profile-weighted mean of category scores
 */
import type {
  Answer,
  AnswerBreakdown,
  AssessableQuestion,
  AssessmentFinding,
  AssessmentResult,
  CategoryId,
  CategoryScore,
  Confidence,
  Effort,
  PriorityBand,
  SiteType,
} from "./types";

/** Report order for categories — setup first, trust last. */
export const CATEGORY_IDS: CategoryId[] = [
  "setup",
  "indexability",
  "content",
  "authority",
  "experience",
  "geo",
  "trust",
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  setup: "Setup & measurement",
  indexability: "Crawlability & indexability",
  content: "On-page & content",
  authority: "Authority",
  experience: "Experience & speed",
  geo: "AI visibility",
  trust: "Trust & hygiene",
};

/**
 * Category weights per site type, in percent. Every profile sums to 100.
 * Mirror of the automated engine's weight table (docs/audit-engine.md §2.1).
 */
export const PROFILE_WEIGHTS: Record<SiteType, Record<CategoryId, number>> = {
  saas: {
    setup: 10,
    indexability: 20,
    content: 25,
    authority: 10,
    experience: 20,
    geo: 10,
    trust: 5,
  },
  ecommerce: {
    setup: 10,
    indexability: 20,
    content: 20,
    authority: 10,
    experience: 25,
    geo: 5,
    trust: 10,
  },
  local: {
    setup: 10,
    indexability: 20,
    content: 15,
    authority: 15,
    experience: 20,
    geo: 10,
    trust: 10,
  },
  publisher: {
    setup: 10,
    indexability: 20,
    content: 30,
    authority: 10,
    experience: 15,
    geo: 10,
    trust: 5,
  },
  other: {
    setup: 10,
    indexability: 20,
    content: 25,
    authority: 10,
    experience: 20,
    geo: 10,
    trust: 5,
  },
};

const ANSWER_SCORES: Record<Answer, number> = { yes: 1, unsure: 0.5, no: 0 };

const EFFORT_PENALTY: Record<Effort, number> = { quick: 0, moderate: 1, involved: 2 };

/** Layers everything else depends on — their findings always rank first. */
const GATED_CATEGORIES: ReadonlySet<CategoryId> = new Set(["setup", "indexability"]);

const BAND_ORDER: Record<PriorityBand, number> = { now: 0, month: 1, later: 2 };

/** Priority thresholds: "now" ≥ 8, "this month" ≥ 4, else "later". */
export const BAND_THRESHOLDS = { now: 8, month: 4 } as const;

export function priorityBand(priority: number): PriorityBand {
  if (priority >= BAND_THRESHOLDS.now) return "now";
  if (priority >= BAND_THRESHOLDS.month) return "month";
  return "later";
}

/** Display band for a 0–100 score (drives color only — never invented stats). */
export function scoreBand(score: number): "success" | "warning" | "danger" {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

/** Confidence: how much of the score rests on "not sure" answers. */
export function confidenceFor(unsureShare: number): Confidence {
  if (unsureShare <= 0.15) return "high";
  if (unsureShare <= 0.4) return "medium";
  return "low";
}

export function scoreAssessment(
  questions: AssessableQuestion[],
  answers: Record<string, Answer>,
  siteType: SiteType,
): AssessmentResult {
  const weights = PROFILE_WEIGHTS[siteType];

  const byCategory = new Map<CategoryId, AssessableQuestion[]>();
  for (const question of questions) {
    const list = byCategory.get(question.category);
    if (list) list.push(question);
    else byCategory.set(question.category, [question]);
  }

  const breakdown: AnswerBreakdown = { yes: 0, unsure: 0, no: 0 };
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer) breakdown[answer] += 1;
  }

  let answered = 0;
  let unsure = 0;

  const categories: CategoryScore[] = [];
  for (const id of CATEGORY_IDS) {
    const list = byCategory.get(id);
    if (!list) continue;

    const scored = list.filter((question) => answers[question.id] !== undefined);
    const severitySum = scored.reduce((sum, question) => sum + question.severity, 0);
    const score =
      severitySum === 0
        ? 0
        : (scored.reduce(
            (sum, question) => sum + question.severity * ANSWER_SCORES[answers[question.id]!],
            0,
          ) /
            severitySum) *
          100;

    answered += scored.length;
    unsure += scored.filter((question) => answers[question.id] === "unsure").length;

    categories.push({
      id,
      label: CATEGORY_LABELS[id],
      score: Math.round(score),
      weight: weights[id],
      answered: scored.length,
      total: list.length,
    });
  }

  const answeredCategories = categories.filter((category) => category.answered > 0);
  const weightSum = answeredCategories.reduce((sum, category) => sum + category.weight, 0);
  const overall =
    weightSum === 0
      ? 0
      : answeredCategories.reduce((sum, category) => sum + category.weight * category.score, 0) /
        weightSum;

  const findings: AssessmentFinding[] = questions.flatMap((question) => {
    const answer = answers[question.id];
    if (answer !== "no" && answer !== "unsure") return [];

    const priority =
      question.severity * 2 -
      EFFORT_PENALTY[question.effort] +
      (GATED_CATEGORIES.has(question.category) ? 2 : 0);

    return [
      {
        questionId: question.id,
        kind: answer === "no" ? ("fix" as const) : ("verify" as const),
        category: question.category,
        severity: question.severity,
        effort: question.effort,
        band: priorityBand(priority),
        priority,
      },
    ];
  });

  findings.sort(
    (a, b) =>
      BAND_ORDER[a.band] - BAND_ORDER[b.band] ||
      b.priority - a.priority ||
      b.severity - a.severity ||
      a.questionId.localeCompare(b.questionId),
  );

  const unsureShare = answered === 0 ? 1 : unsure / answered;

  return {
    score: Math.round(overall),
    confidence: confidenceFor(unsureShare),
    unsureShare,
    categories,
    findings,
    breakdown,
    answered,
    total: questions.length,
  };
}
