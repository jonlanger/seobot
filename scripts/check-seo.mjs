/**
 * Content SEO audit for the typed content layer.
 *
 * Loads `src/content` through the project's own Vite pipeline (so aliases and
 * config evolve with the app), then validates the invariants search engines and
 * social cards depend on:
 *
 *   - title / description length budgets (docs/seo-research.md §3.3)
 *   - clean canonical paths
 *   - JSON-LD is well-formed schema.org
 *   - FAQPage schema text is byte-identical to the visible FAQ copy
 *
 * Run with: npm run check:seo
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ----------------------------- Content loading ----------------------------- */

const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});

let content;
try {
  content = await vite.ssrLoadModule("/src/content/index.ts");
} finally {
  await vite.close();
}

// Any export shaped like a PageSeo (title + description + path) is a page —
// both single page objects and arrays of them (e.g. glossaryTerms).
const looksLikePage = (value) =>
  value !== null &&
  typeof value === "object" &&
  typeof value.title === "string" &&
  typeof value.description === "string" &&
  typeof value.path === "string";

const pages = [];
for (const [exportName, value] of Object.entries(content)) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (looksLikePage(item)) {
        pages.push([typeof item.slug === "string" ? item.slug : `${exportName}[${index}]`, item]);
      }
    });
  } else if (looksLikePage(value)) {
    pages.push([exportName, value]);
  }
}

/* --------------------------------- Checks ---------------------------------- */

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 110;
const DESC_MAX = 160;
const ROBOTS_VALUES = ["index, follow", "noindex"];

const rows = [];
let failures = 0;

function check(page, name, pass, value, budget, note = "") {
  if (!pass) failures += 1;
  rows.push({
    page,
    check: name,
    value,
    budget,
    status: pass ? "PASS" : "FAIL",
    note,
  });
}

function faqParity(page) {
  const items = Array.isArray(page.faq) ? page.faq : (page.faq?.items ?? []);
  const schema = (page.jsonLd ?? []).find((doc) => doc["@type"] === "FAQPage");

  if (items.length === 0 && !schema) {
    return { pass: true, value: "—", note: "no FAQ on page" };
  }
  if (items.length === 0) {
    return { pass: false, value: "schema only", note: "FAQPage schema without visible FAQ items" };
  }
  if (!schema) {
    return { pass: false, value: `${items.length} items`, note: "visible FAQ but no FAQPage schema" };
  }

  const visible = JSON.stringify(items.map((item) => [item.question, item.answer]));
  const marked = JSON.stringify(
    (schema.mainEntity ?? []).map((q) => [q.name, q.acceptedAnswer?.text]),
  );
  const match = visible === marked;
  return {
    pass: match,
    value: `${items.length} items`,
    note: match ? "visible text matches schema" : "schema text differs from visible FAQ",
  };
}

for (const [name, page] of pages) {
  const titleLen = page.title.length;
  check(
    name,
    "title length",
    titleLen >= TITLE_MIN && titleLen <= TITLE_MAX,
    `${titleLen} chars`,
    `${TITLE_MIN}–${TITLE_MAX} chars`,
  );

  const descLen = page.description.length;
  check(
    name,
    "description length",
    descLen >= DESC_MIN && descLen <= DESC_MAX,
    `${descLen} chars`,
    `${DESC_MIN}–${DESC_MAX} chars`,
  );

  const pathOkay =
    /^\/[a-z0-9\-/]*$/i.test(page.path) &&
    (page.path === "/" || !page.path.endsWith("/"));
  check(name, "canonical path", pathOkay, page.path, "clean /route", pathOkay ? "" : "trailing slash, query, or hash in path");

  if (page.robots !== undefined) {
    check(name, "robots directive", ROBOTS_VALUES.includes(page.robots), page.robots, ROBOTS_VALUES.join(" | "));
  }

  const jsonLd = page.jsonLd ?? [];
  let jsonLdOkay = true;
  for (const doc of jsonLd) {
    if (doc["@context"] !== "https://schema.org" || !doc["@type"]) jsonLdOkay = false;
    try {
      JSON.stringify(doc);
    } catch {
      jsonLdOkay = false;
    }
  }
  check(name, "JSON-LD", jsonLdOkay, `${jsonLd.length} doc${jsonLd.length === 1 ? "" : "s"}`, "well-formed schema.org");

  const faq = faqParity(page);
  check(name, "FAQ ↔ schema", faq.pass, faq.value, "byte-identical", faq.note);
}

/* --------------------------------- Report ---------------------------------- */

const pad = (s, n) => String(s).padEnd(n);
console.log(
  `${pad("page", 26)} ${pad("check", 19)} ${pad("value", 13)} ${pad("budget", 15)} ${pad("status", 7)} note`,
);
console.log("-".repeat(122));
for (const row of rows) {
  console.log(
    `${pad(row.page, 26)} ${pad(row.check, 19)} ${pad(row.value, 13)} ${pad(row.budget, 15)} ${pad(row.status, 7)} ${row.note}`,
  );
}

console.log("-".repeat(122));
if (failures > 0) {
  console.error(`${failures} SEO check(s) FAILED across ${pages.length} page(s)`);
  process.exit(1);
} else {
  console.log(`All ${rows.length} SEO checks passed across ${pages.length} page(s).`);
}
