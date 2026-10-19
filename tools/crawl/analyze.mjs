#!/usr/bin/env node
/**
 * Deeper cuts over the JS-wall study output (out/results.json).
 * Reproducible companion to summary.md — prints thematic groups, blocked-site
 * lists, robots-vs-coverage correlation, and caveat lists.
 *
 * Usage: node analyze.mjs [--out out] [--json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const OUT = path.resolve(arg("--out", path.join(import.meta.dirname, "out")));

const data = JSON.parse(readFileSync(path.join(OUT, "results.json"), "utf8"));
const sites = data.sites;
const byDomain = new Map(sites.map((s) => [s.domain, s]));

const median = (arr) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)] : null);
const list = (arr) => arr.map((s) => `${s.domain} (${s.rank})`).join(", ");
const coverageOf = (s) => (s.classification === "measured" ? s.metrics.coverage : null);

/* thematic groups — top domains per category, from the study list */
const GROUPS = {
  "Search engines": ["google.com", "bing.com", "yahoo.com", "duckduckgo.com", "yandex.ru", "yandex.com", "baidu.com", "so.com", "naver.com", "google.cn"],
  "AI products": ["openai.com", "chatgpt.com", "perplexity.ai", "claude.ai", "anthropic.com", "gemini.google.com", "bard.google.com", "huggingface.co", "midjourney.com", "stability.ai"],
  "Social": ["facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "linkedin.com", "reddit.com", "pinterest.com", "snapchat.com", "tumblr.com", "vk.com", "vk.ru", "ok.ru", "weibo.com", "threads.net", "discord.com"],
  "News & media": ["nytimes.com", "bbc.com", "bbc.co.uk", "cnn.com", "theguardian.com", "washingtonpost.com", "wsj.com", "bloomberg.com", "reuters.com", "forbes.com", "medium.com", "substack.com", "lemonde.fr", "spiegel.de", "elpais.com"],
  "E-commerce": ["amazon.com", "ebay.com", "walmart.com", "etsy.com", "shopify.com", "aliexpress.com", "alibaba.com", "taobao.com", "tmall.com", "target.com", "bestbuy.com", "shein.com", "temu.com", "rakuten.co.jp", "amazon.in", "amazon.co.za"],
  "Cloud & dev": ["github.com", "gitlab.com", "cloudflare.com", "aws.amazon.com", "digitalocean.com", "vercel.com", "netlify.com", "heroku.com", "npmjs.com", "stackoverflow.com", "docker.com", "oracle.com", "ibm.com", "salesforce.com", "sap.com"],
  "Streaming & entertainment": ["netflix.com", "spotify.com", "twitch.tv", "hulu.com", "disneyplus.com", "max.com", "soundcloud.com", "roblox.com", "epicgames.com", "steampowered.com", "steamcommunity.com"],
  "Reference & edu": ["wikipedia.org", "en.wikipedia.org", "britannica.com", "cambridge.org", "oxford.com", "stanford.edu", "mit.edu", "harvard.edu", "archive.org", "wikimedia.org"],
};

const lines = [];
const say = (s = "") => {
  lines.push(s);
  if (!argv.includes("--json")) console.log(s);
};

say(`# Deep cuts — ${sites.length} sites, generated ${new Date().toISOString()}`);
say();

/* group stats */
say("## Thematic groups (median coverage, classification mix)");
say();
say("| group | n | measured | median cov | blocked* | robots-excl |");
say("|---|---|---|---|---|---|");
const groupStats = {};
for (const [name, domains] of Object.entries(GROUPS)) {
  const found = domains.map((d) => byDomain.get(d)).filter(Boolean);
  const meas = found.filter((s) => s.classification === "measured");
  const covs = meas.map(coverageOf);
  const blocked = found.filter((s) => ["raw_blocked", "both_blocked"].includes(s.classification));
  const rex = found.filter((s) => s.classification === "robots_excluded");
  groupStats[name] = {
    n: found.length,
    measured: meas.length,
    median: median(covs),
    blocked: blocked.length,
    robotsExcluded: rex.length,
    sites: found.map((s) => ({ domain: s.domain, classification: s.classification, coverage: coverageOf(s) })),
  };
  say(`| ${name} | ${found.length} | ${meas.length} | ${median(covs) ?? "—"}${median(covs) !== null ? "%" : ""} | ${blocked.length} | ${rex.length} |`);
}
say();
say("*blocked = raw_blocked or both_blocked");

/* notable individual AI/search sites */
say();
say("## Notable sites (AI companies, search, big brands)");
say();
for (const d of ["openai.com", "chatgpt.com", "perplexity.ai", "claude.ai", "anthropic.com", "huggingface.co", "google.com", "bing.com", "duckduckgo.com", "yandex.ru", "baidu.com", "reddit.com", "amazon.com", "walmart.com", "shopify.com", "nytimes.com", "wikipedia.org", "github.com", "stackoverflow.com", "vercel.com"]) {
  const s = byDomain.get(d);
  if (!s) continue;
  const cov = coverageOf(s);
  say(`- ${pad(d, 22)} ${pad(s.classification, 17)} ${cov === null ? "" : `coverage ${cov}%`}`);
}

/* robots vs coverage */
say();
say("## Robots policy vs JS-wall (do AI-blockers also have JS walls?)");
say();
const blockVerdicts = new Set(["block"]);
const gptBotVerdict = (s) => s.robots?.policies?.GPTBot?.verdict ?? "unknown";
const withRobots = sites.filter((s) => s.robots?.policies);
const blockedSites = withRobots.filter((s) => gptBotVerdict(s) === "block");
const otherSites = withRobots.filter((s) => gptBotVerdict(s) !== "block");
for (const [label, set] of [["GPTBot blocked (specific/wildcard)", blockedSites], ["GPTBot not blocked", otherSites]]) {
  const meas = set.filter((s) => s.classification === "measured");
  const covs = meas.map(coverageOf);
  const blockedRaw = set.filter((s) => ["raw_blocked", "both_blocked"].includes(s.classification));
  say(`- ${label}: n=${set.length} | measured ${meas.length} (${pctf(meas.length / set.length)}) | median cov ${median(covs) ?? "—"}% | raw/both blocked ${blockedRaw.length} (${pctf(blockedRaw.length / set.length)})`);
}

/* CJK and encoding-suspect */
say();
say("## Caveats");
const cjk = sites.filter((s) => s.metrics?.cjk);
say(`- CJK-dominant (bigram tokenization): ${cjk.length} sites — ${list(cjk.slice(0, 12))}${cjk.length > 12 ? " …" : ""}`);
const encodingSuspect = sites.filter((s) => s.classification === "measured" && s.metrics.rawWords > 100 && s.metrics.coverage <= 1);
say(`- Encoding-suspect (raw has >100 tokens but ≤1% token match — likely charset mismatch): ${list(encodingSuspect)}`);
const renderFailed = sites.filter((s) => s.classification === "render_failed");
say(`- render_failed (${renderFailed.length}): ${renderFailed.map((s) => `${s.domain}: ${(s.renderError ?? "").slice(0, 60)}`).join(" | ")}`);

/* lists */
say();
say("## Blocked-site lists");
say();
for (const cls of ["robots_excluded", "both_blocked", "raw_blocked"]) {
  const set = sites.filter((s) => s.classification === cls);
  say(`### ${cls} (${set.length})`);
  say();
  say(set.map((s) => `${s.domain} (${s.rank})`).join(", "));
  say();
}

/* top coverage */
say("## Highest coverage (fully server-rendered)");
say();
const measured = sites.filter((s) => s.classification === "measured");
const top = [...measured].sort((a, b) => b.metrics.coverage - a.metrics.coverage).slice(0, 20);
say(top.map((s) => `${s.domain} ${s.metrics.coverage}%`).join(", "));
say();

/* json export for the site/content stage */
writeFileSync(path.join(OUT, "analysis.json"), JSON.stringify({ generatedAt: new Date().toISOString(), groups: groupStats }, null, 2));
say(`Wrote ${path.join(OUT, "analysis.json")}`);

function pad(s, n) { return String(s).padEnd(n); }
function pctf(x) { return `${(100 * x).toFixed(1)}%`; }
