/**
 * Integrity checks for the on-site SEO Check (docs/seo-check.md).
 *
 * Loads the question catalog and the scoring engine through the project's own
 * Vite pipeline, then validates the invariants the tool's honesty and math
 * depend on:
 *
 *   - every question id is unique and shared-shape with the automated catalog
 *   - user-facing copy is complete (prompt / why / action, fix & verify steps)
 *   - every category is covered and every site type gets ≥ 14 questions (the check stays short)
 *   - profile weights sum to 100
 *   - scoring smoke tests: all yes → 100, all no → 0, all unsure → 50
 *   - findings are sorted by band, and deep links resolve (or safely don't)
 *
 * Run with: npm run check:seo-check
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});

let content;
let audit;
try {
  content = await vite.ssrLoadModule("/src/content/seo-check.ts");
  audit = await vite.ssrLoadModule("/src/lib/audit/index.ts");
} finally {
  await vite.close();
}

/* --------------------------------- Harness --------------------------------- */

const rows = [];
let failures = 0;

function check(subject, name, pass, value, budget = "", note = "") {
  if (!pass) failures += 1;
  rows.push({
    subject,
    check: name,
    value,
    budget,
    status: pass ? "PASS" : "FAIL",
    note,
  });
}

/* ------------------------------ Catalog shape ------------------------------ */

const questions = content.seoCheckQuestions;
const VALID_CATEGORIES = new Set(audit.CATEGORY_IDS);
const VALID_EFFORTS = new Set(["quick", "moderate", "involved"]);
const VALID_LINK_KINDS = new Set(["tool", "site", "search", "pageSpeed"]);

const seenIds = new Set();
for (const q of questions) {
  const duplicate = !q.id || seenIds.has(q.id);
  seenIds.add(q.id);
  check(q.id || "(missing id)", "id unique", !duplicate, q.id || "—", "unique across catalog");

  const copyFields = ["prompt", "why", "action"];
  const missing = copyFields.filter((key) => typeof q[key] !== "string" || q[key].trim() === "");
  check(
    q.id,
    "copy complete",
    missing.length === 0,
    missing.length === 0 ? "prompt · why · action" : `missing: ${missing.join(", ")}`,
    "all non-empty",
  );

  const fieldsOk =
    Number.isInteger(q.severity) &&
    q.severity >= 1 &&
    q.severity <= 5 &&
    VALID_EFFORTS.has(q.effort) &&
    VALID_CATEGORIES.has(q.category);
  const stepsOk =
    Array.isArray(q.fix) && q.fix.length >= 2 && Array.isArray(q.verify) && q.verify.length >= 1;
  const linkOk =
    q.link === undefined ||
    (VALID_LINK_KINDS.has(q.link.kind) &&
      typeof q.link.label === "string" &&
      q.link.label.length > 0 &&
      (q.link.kind !== "tool" ||
        (typeof q.link.href === "string" && q.link.href.startsWith("https://"))) &&
      (q.link.kind !== "site" ||
        (typeof q.link.path === "string" && q.link.path.startsWith("/"))));
  check(
    q.id,
    "fields & steps",
    fieldsOk && stepsOk && linkOk,
    `sev ${q.severity} · ${q.effort} · ${q.fix?.length ?? 0} fix · ${q.verify?.length ?? 0} verify`,
    "severity 1–5 · fix ≥ 2 · verify ≥ 1 · link OK",
  );
}

/* ------------------------------- Coverage ---------------------------------- */

for (const id of audit.CATEGORY_IDS) {
  const count = questions.filter((q) => q.category === id).length;
  check("coverage", `category ${id}`, count >= 1, `${count} question(s)`, "≥ 1");
}

const SITE_TYPES = ["saas", "ecommerce", "local", "publisher", "other"];
for (const type of SITE_TYPES) {
  const count = content.questionsForSiteType(type).length;
  check("coverage", `site type ${type}`, count >= 14 && count <= 16, `${count} questions`, "14–16");
}

/* ------------------------------ Profile weights ---------------------------- */

for (const [type, weights] of Object.entries(audit.PROFILE_WEIGHTS)) {
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
  check("weights", `${type} profile`, sum === 100, `${sum}%`, "= 100%");
  const negative = Object.values(weights).some((weight) => weight < 0);
  check("weights", `${type} non-negative`, !negative, negative ? "negative found" : "all ≥ 0", "weights ≥ 0");
}

/* ----------------------------- Scoring smoke tests ------------------------- */

const saas = content.questionsForSiteType("saas");
const answersFor = (value) => Object.fromEntries(saas.map((q) => [q.id, value]));

const allYes = audit.scoreAssessment(saas, answersFor("yes"), "saas");
check("scoring", "all yes → score", allYes.score === 100, String(allYes.score), "= 100");
check("scoring", "all yes → findings", allYes.findings.length === 0, `${allYes.findings.length}`, "= 0");
check("scoring", "all yes → confidence", allYes.confidence === "high", allYes.confidence, "high");

const allNo = audit.scoreAssessment(saas, answersFor("no"), "saas");
check("scoring", "all no → score", allNo.score === 0, String(allNo.score), "= 0");
check(
  "scoring",
  "all no → findings",
  allNo.findings.length === saas.length,
  `${allNo.findings.length}/${saas.length}`,
  "one per question",
);
check(
  "scoring",
  "all no → fix-only",
  allNo.findings.every((finding) => finding.kind === "fix"),
  "fix",
  "kind = fix",
);

const allUnsure = audit.scoreAssessment(saas, answersFor("unsure"), "saas");
check("scoring", "all unsure → score", allUnsure.score === 50, String(allUnsure.score), "= 50");
check(
  "scoring",
  "all unsure → verify-only",
  allUnsure.findings.every((finding) => finding.kind === "verify"),
  "verify",
  "kind = verify",
);
check("scoring", "all unsure → confidence", allUnsure.confidence === "low", allUnsure.confidence, "low");
check(
  "scoring",
  "all yes → breakdown",
  allYes.breakdown.yes === saas.length && allYes.breakdown.unsure === 0 && allYes.breakdown.no === 0,
  JSON.stringify(allYes.breakdown),
  "yes only",
);
check(
  "scoring",
  "all unsure → breakdown",
  allUnsure.breakdown.unsure === saas.length &&
    allUnsure.breakdown.yes === 0 &&
    allUnsure.breakdown.no === 0,
  JSON.stringify(allUnsure.breakdown),
  "unsure only",
);
const none = audit.scoreAssessment(saas, {}, "saas");
check("scoring", "no answers → score", none.score === 0, String(none.score), "= 0");
check("scoring", "no answers → findings", none.findings.length === 0, `${none.findings.length}`, "= 0");
check(
  "scoring",
  "breakdown sums to answered",
  none.breakdown.yes + none.breakdown.unsure + none.breakdown.no === none.answered,
  `${none.answered}`,
  "= answered",
);
check(
  "scoring",
  "all no → breakdown",
  allNo.breakdown.no === saas.length && allNo.breakdown.yes === 0 && allNo.breakdown.unsure === 0,
  JSON.stringify(allNo.breakdown),
  "no only",
);

const BAND_ORDER = { now: 0, month: 1, later: 2 };
const sorted = allNo.findings.every(
  (finding, index) =>
    index === 0 || BAND_ORDER[allNo.findings[index - 1].band] <= BAND_ORDER[finding.band],
);
check("scoring", "findings band order", sorted, "now → month → later", "non-decreasing");

const nowCount = allNo.findings.filter((finding) => finding.band === "now").length;
check("scoring", "all no → has now band", nowCount >= 1, `${nowCount} in “now”`, "≥ 1");

/* ------------------------------ Link resolution ---------------------------- */

const byId = (id) => questions.find((q) => q.id === id);
const resolve = (id, url) => content.resolveQuestionLink(byId(id)?.link, url);

check(
  "links",
  "robots resolves",
  resolve("idx.robots", "https://example.com")?.href === "https://example.com/robots.txt",
  resolve("idx.robots", "https://example.com")?.href ?? "null",
  "= origin + /robots.txt",
);
check(
  "links",
  "bare domain resolves",
  resolve("idx.robots", "example.com")?.href === "https://example.com/robots.txt",
  resolve("idx.robots", "example.com")?.href ?? "null",
  "bare domain tolerated",
);
check(
  "links",
  "site: search resolves",
  resolve("idx.noindex", "https://www.example.com/page")?.href ===
    `https://www.google.com/search?q=${encodeURIComponent("site:www.example.com")}`,
  resolve("idx.noindex", "https://www.example.com/page")?.href ?? "null",
  "= encoded site: query",
);
const psi = resolve("prf.cwv", "https://example.com");
check(
  "links",
  "pageSpeed resolves",
  Boolean(
    psi &&
      psi.href.startsWith("https://pagespeed.web.dev/analysis?url=") &&
      psi.href.includes(encodeURIComponent("https://example.com")),
  ),
  psi?.href ?? "null",
  "prefilled + mobile",
);
check(
  "links",
  "tool link passthrough",
  resolve("setup.gsc", null)?.href === "https://search.google.com/search-console",
  resolve("setup.gsc", null)?.href ?? "null",
  "works without URL",
);
check(
  "links",
  "invalid URL → null",
  resolve("idx.robots", "not a url") === null,
  String(resolve("idx.robots", "not a url")),
  "no throw, no dead link",
);
check(
  "links",
  "missing URL → null",
  resolve("idx.robots", "") === null && resolve("idx.robots", null) === null,
  "null",
  "hidden until provided",
);
check(
  "links",
  "bare domain parses",
  content.parseSiteUrl("example.com")?.host === "example.com",
  JSON.stringify(content.parseSiteUrl("example.com")),
  "https assumed",
);
check(
  "links",
  "rejects non-web protocols",
  content.parseSiteUrl("ftp://example.com") === null &&
    content.parseSiteUrl("localhost") === null,
  "null",
  "http(s) with a dot only",
);

/* --------------------------------- Report ---------------------------------- */

const pad = (s, n) => String(s).padEnd(n);
console.log(
  `${pad("subject", 26)} ${pad("check", 18)} ${pad("value", 26)} ${pad("budget", 24)} ${pad("status", 7)} note`,
);
console.log("-".repeat(130));
for (const row of rows) {
  console.log(
    `${pad(row.subject, 26)} ${pad(row.check, 18)} ${pad(row.value, 26)} ${pad(row.budget, 24)} ${pad(row.status, 7)} ${row.note}`,
  );
}

console.log("-".repeat(130));
if (failures > 0) {
  console.error(
    `${failures} SEO Check check(s) FAILED across ${questions.length} questions and ${rows.length} checks`,
  );
  process.exit(1);
} else {
  console.log(
    `All ${rows.length} SEO Check checks passed — ${questions.length} questions · ${audit.CATEGORY_IDS.length} categories · ${SITE_TYPES.length} site profiles.`,
  );
}
