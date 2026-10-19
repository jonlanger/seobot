// One-off exploratory analysis — patterns in what makes a top site machine-readable.
// Reads the derived study JSON and prints cross-tabs + correlations for the
// node-graph "anatomy" view. Not part of the build.
import { readFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(new URL("../src/content/data/top-sites-study.json", import.meta.url), "utf8"));
const crawlers = raw.meta.crawlers;
const CODE = { b: "block", a: "allow", p: "partial", u: "unset" };

const sites = raw.sites.map((s) => {
  const verdicts = {};
  crawlers.forEach((t, i) => (verdicts[t] = CODE[s.robots.codes?.[i] ?? "u"] ?? "unset"));
  return {
    rank: s.rank,
    domain: s.domain,
    classification: s.classification,
    coverage: s.coverage,
    robotsStatus: s.robots.status,
    wildcard: s.robots.wildcard,
    verdicts,
    metrics: s.metrics ?? null,
  };
});

const measured = sites.filter((s) => s.coverage !== null);
console.log(`sites=${sites.length} measured=${measured.length}`);

// ---------- helpers ----------
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy || 1);
}
const med = (xs) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};

// ---------- 1. coverage vs headings coverage ----------
{
  const rows = measured.filter((s) => s.metrics && s.metrics.headingsCoverage !== null);
  const r = pearson(rows.map((s) => s.coverage), rows.map((s) => s.metrics.headingsCoverage));
  const lowHeads = rows.filter((s) => s.metrics.headingsCoverage < 50);
  const highHeads = rows.filter((s) => s.metrics.headingsCoverage >= 50);
  console.log(`\n[1] coverage vs headingsCoverage r=${r.toFixed(2)} n=${rows.length}`);
  console.log(`    heads<50: n=${lowHeads.length} medianCov=${med(lowHeads.map((s) => s.coverage))}`);
  console.log(`    heads>=50: n=${highHeads.length} medianCov=${med(highHeads.map((s) => s.coverage))}`);
}

// ---------- 2. JSON-LD ----------
{
  const rows = measured.filter((s) => s.metrics);
  const none = rows.filter((s) => s.metrics.jsonLdRendered.length === 0);
  const server = rows.filter(
    (s) => s.metrics.jsonLdRendered.length > 0 && s.metrics.jsonLdMissingFromRaw.length === 0,
  );
  const clientOnly = rows.filter(
    (s) => s.metrics.jsonLdRendered.length > 0 && s.metrics.jsonLdMissingFromRaw.length > 0,
  );
  const cov = (arr, key = "coverage") => med(arr.map((s) => s[key]));
  console.log(`\n[2] JSON-LD on measured sites`);
  console.log(`    none:        n=${none.length} medianCov=${cov(none)}`);
  console.log(`    server-side: n=${server.length} medianCov=${cov(server)}`);
  console.log(`    client-only: n=${clientOnly.length} medianCov=${cov(clientOnly)}`);
  const typeCounts = {};
  for (const s of rows) for (const t of s.metrics.jsonLdRendered) typeCounts[t] = (typeCounts[t] || 0) + 1;
  const top = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 18);
  console.log("    top types:", top.map(([t, n]) => `${t}:${n}`).join(" "));
}

// ---------- 3. robots policy vs readability ----------
{
  const groups = {
    GPTBot: ["GPTBot"],
    "AI retrieval (OAI-SearchBot)": ["OAI-SearchBot"],
    "classic search (Googlebot)": ["Googlebot"],
  };
  console.log(`\n[3] robots policy vs readability (all 500)`);
  for (const [label, tokens] of Object.entries(groups)) {
    for (const verdict of ["block", "allow"]) {
      const subset = sites.filter((s) => tokens.every((t) => s.verdicts[t] === verdict));
      if (!subset.length) continue;
      const readable = subset.filter((s) => s.coverage !== null);
      const medCov = readable.length ? med(readable.map((s) => s.coverage)) : NaN;
      console.log(
        `    ${label} ${verdict}: n=${subset.length} readable=${readable.length} (${((100 * readable.length) / subset.length).toFixed(0)}%) medianCov=${Number.isNaN(medCov) ? "—" : medCov}`,
      );
    }
  }
}

// ---------- 4. vertical × policy willingness ----------
{
  console.log(`\n[4] verticals: coverage + AI-access posture`);
  const groupOf = {};
  for (const g of raw.groups) for (const s of raw.sites) {}
  // groups aren't per-site in JSON v? check
  const gs = raw.groups ?? [];
  console.log("    groups field:", gs.length ? "present" : "absent");
}

// ---------- 5. rank vs coverage ----------
{
  const r = pearson(measured.map((s) => s.rank), measured.map((s) => s.coverage));
  console.log(`\n[5] rank vs coverage r=${r.toFixed(3)} (n=${measured.length})`);
}

// ---------- 6. title parity / challenge flags ----------
{
  const rows = measured.filter((s) => s.metrics);
  const differs = rows.filter((s) => s.metrics.titleDiffers);
  console.log(`\n[6] title differs from rendered: n=${differs.length} medianCov=${med(differs.map((s) => s.coverage))}`);
  const challenge = measured.filter((s) => s.metrics?.challengeLike);
  console.log(`    challengeLike among measured: n=${challenge.length} medianCov=${med(challenge.map((s) => s.coverage))}`);
}

// ---------- 7. "great site" composite ----------
{
  console.log(`\n[7] candidate archetypes`);
  const aiRetrieval = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Amazonbot"];
  const training = ["GPTBot", "ClaudeBot", "CCBot", "Bytespider", "Meta-ExternalAgent", "anthropic-ai", "Google-Extended", "Applebot-Extended"];
  const openAI = (s) => aiRetrieval.every((t) => s.verdicts[t] !== "block");
  const openTrain = (s) => training.every((t) => s.verdicts[t] !== "block");
  const noBlocks = (s) => openAI(s) && openTrain(s);

  const categories = {
    "open + readable>=90": (s) => s.coverage !== null && s.coverage >= 90 && noBlocks(s),
    "open for AI search, blocked training": (s) => openAI(s) && training.some((t) => s.verdicts[t] === "block") && s.coverage !== null,
    "block AI retrieval": (s) => !openAI(s),
    "walled (raw/both)": (s) => s.classification === "raw_blocked" || s.classification === "both_blocked",
    "robots-excluded": (s) => s.classification === "robots_excluded",
  };
  for (const [label, fn] of Object.entries(categories)) {
    const subset = sites.filter(fn);
    const readable = subset.filter((s) => s.coverage !== null);
    console.log(
      `    ${label}: n=${subset.length} medianRank=${med(subset.map((s) => s.rank))} medianCov=${readable.length ? med(readable.map((s) => s.coverage)) : "—"}`,
    );
  }
}

// ---------- 8. combined-signal correlation matrix ----------
{
  const rows = measured.filter((s) => s.metrics && s.metrics.headingsCoverage !== null);
  const aiRetrieval = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Amazonbot"];
  const training = ["GPTBot", "ClaudeBot", "CCBot", "Bytespider", "Meta-ExternalAgent", "anthropic-ai", "Google-Extended", "Applebot-Extended"];
  const cols = {
    coverage: (s) => s.coverage,
    headings: (s) => s.metrics.headingsCoverage,
    jsonLd: (s) => s.metrics.jsonLdRendered.length,
    jsonLdRadius: (s) => s.metrics.jsonLdRendered.length - s.metrics.jsonLdMissingFromRaw.length,
    aiBlocks: (s) => aiRetrieval.filter((t) => s.verdicts[t] === "block").length,
    trainBlocks: (s) => training.filter((t) => s.verdicts[t] === "block").length,
    words: (s) => s.metrics.rawWords,
    rank: (s) => s.rank,
  };
  const keys = Object.keys(cols);
  console.log(`\n[8] correlation matrix (n=${rows.length})`);
  console.log("        " + keys.map((k) => k.slice(0, 9).padStart(10)).join(""));
  for (const a of keys) {
    const line = [];
    for (const b of keys) line.push(pearson(rows.map(cols[a]), rows.map(cols[b])).toFixed(2).padStart(10));
    console.log(a.padEnd(8) + line.join(""));
  }
}

// ---------- 9. great sites shortlist ----------
{
  const aiRetrieval = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Amazonbot"];
  const noAISearchBlock = (s) => aiRetrieval.every((t) => s.verdicts[t] !== "block");
  const great = measured
    .filter((s) => s.coverage >= 90 && noAISearchBlock(s) && s.metrics && s.metrics.jsonLdRendered.length > 0 && s.metrics.jsonLdMissingFromRaw.length === 0)
    .sort((a, b) => b.coverage - a.coverage || a.rank - b.rank);
  console.log(`\n[9] flagship "great" sites (cov>=90, open AI search, server JSON-LD): n=${great.length}`);
  console.log(great.slice(0, 40).map((s) => `${s.domain}(#${s.rank},${s.coverage}%)`).join("  "));
}

// ---------- 10. worst offenders among most-ranked ----------
{
  const aiRetrieval = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Amazonbot"];
  const aiBlocks = (s) => aiRetrieval.filter((t) => s.verdicts[t] === "block").length;
  const notable = sites.filter((s) => s.rank <= 150).sort((a, b) => (a.coverage ?? -1) - (b.coverage ?? -1));
  console.log(`\n[10] top-150 sites by low coverage:`);
  console.log(notable.slice(0, 30).map((s) => `${s.domain}(#${s.rank},${s.coverage === null ? s.classification : s.coverage + "%"},aiBlocks=${aiBlocks(s)})`).join(" "));
}

// ---------- 11. wildcard posture ----------
{
  const byWildcard = {};
  for (const s of sites) {
    const k = `${s.wildcard} (status ${s.robotsStatus})`;
    byWildcard[k] = (byWildcard[k] || 0) + 1;
  }
  console.log(`\n[11] wildcard posture:`, byWildcard);
}

// ---------- 12. per-vertical AI-posture cross-tab ----------
{
  const analysis = JSON.parse(readFileSync(new URL("../tools/crawl/out/analysis.json", import.meta.url), "utf8"));
  console.log(`\n[12] per-vertical: median coverage, AI-search blocks, robots-excluded`);
  const aiRetrieval = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Amazonbot"];
  for (const [name, g] of Object.entries(analysis.groups)) {
    const domains = new Set(g.sites.map((m) => m.domain));
    const members = sites.filter((s) => domains.has(s.domain));
    const readable = members.filter((s) => s.coverage !== null);
    const aiBlocked = members.filter((s) => aiRetrieval.some((t) => s.verdicts[t] === "block")).length;
    const excluded = members.filter((s) => s.classification === "robots_excluded").length;
    console.log(
      `    ${name.padEnd(30)} n=${String(members.length).padStart(2)} medianCov=${(g.median ?? "—").toString().padStart(6)} aiBlocked=${aiBlocked} robotsExcl=${excluded} walled=${g.blocked}`,
    );
  }
}

// ---------- 13. cross-tab: readability gate × AI-access gate ----------
{
  const aiRetrieval = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Amazonbot"];
  const rows = [
    { label: "open AI retrieval + readable>=70", fn: (s) => aiRetrieval.every((t) => s.verdicts[t] !== "block") && s.coverage !== null && s.coverage >= 70 },
    { label: "open AI retrieval + readable<70", fn: (s) => aiRetrieval.every((t) => s.verdicts[t] !== "block") && s.coverage !== null && s.coverage < 70 },
    { label: "open AI retrieval + walled", fn: (s) => aiRetrieval.every((t) => s.verdicts[t] !== "block") && s.coverage === null && s.classification !== "robots_excluded" },
    { label: "AI retrieval blocked + readable>=70", fn: (s) => aiRetrieval.some((t) => s.verdicts[t] === "block") && s.coverage !== null && s.coverage >= 70 },
    { label: "AI retrieval blocked + readable<70", fn: (s) => aiRetrieval.some((t) => s.verdicts[t] === "block") && s.coverage !== null && s.coverage < 70 },
    { label: "AI retrieval blocked + walled", fn: (s) => aiRetrieval.some((t) => s.verdicts[t] === "block") && s.coverage === null && s.classification !== "robots_excluded" },
    { label: "robots-excluded (wildcard)", fn: (s) => s.classification === "robots_excluded" },
  ];
  console.log(`\n[13] the two-gate cross-tab`);
  for (const r of rows) {
    const subset = sites.filter(r.fn);
    console.log(`    ${r.label.padEnd(38)} n=${String(subset.length).padStart(3)}`);
  }
}
