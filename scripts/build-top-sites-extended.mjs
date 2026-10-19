#!/usr/bin/env node
/**
 * Build the extended study (src/content/data/top-sites-study-1k.json) from multiple js-wall result files.
 * Keeps EVERY crawled site (walled / robots-excluded / failed included); nothing is dropped.
 *
 *   node scripts/build-top-sites-extended.mjs --list tools/crawl/data/top-2200.json \
 *        tools/crawl/out/results.json tools/crawl/out-501-1000/results.json <more results.json…>
 *
 * Writes: tools/crawl/data/top-crawled.json (list of exactly the crawled sites, in rank order),
 *         tools/crawl/out/results-extended.json (merged), src/content/data/top-sites-study-1k.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const li = argv.indexOf("--list");
const listPath = resolve(root, argv[li + 1]);
const inputs = argv.filter((_, i) => i !== li && i !== li + 1).map((f) => resolve(root, f));
const run = (script, args) => execFileSync("node", [join(root, "scripts", script), ...args], { stdio: ["ignore", "pipe", "inherit"] }).toString();

const merged = join(root, "tools/crawl/out/results-extended.json");
console.log(run("merge-crawl-results.mjs", ["--out", merged, ...inputs]).trim());

// Trim the list to the crawled domains so build-top-sites-data's count check passes.
const full = JSON.parse(readFileSync(listPath, "utf8"));
const crawled = new Set(JSON.parse(readFileSync(merged, "utf8")).sites.map((s) => s.domain));
const missing = full.sites.filter((s) => crawled.has(s.domain)).length;
const trimmed = { ...full, sites: full.sites.filter((s) => crawled.has(s.domain)), selected: missing };
if (trimmed.sites.length !== crawled.size) throw new Error(`list/crawl mismatch: ${trimmed.sites.length} vs ${crawled.size}`);
const crawledList = join(root, "tools/crawl/data/top-crawled.json");
writeFileSync(crawledList, JSON.stringify(trimmed, null, 2));

const outFile = join(root, "src/content/data/top-sites-study-1k.json");
console.log(run("build-top-sites-data.mjs", ["--list", crawledList, "--results", merged, "--out", outFile]).trim());

const d = JSON.parse(readFileSync(outFile, "utf8"));
const maxRank = Math.max(...d.sites.map((s) => s.rank));
const measured = d.sites.filter((s) => s.classification === "measured").length;
d.meta.runs = 1;
d.meta.highestRankCrawled = maxRank;
d.meta.counts = { crawled: d.sites.length, measured, ...Object.fromEntries(Object.entries(d.summary.counts).map(([k, v]) => [k, v])) };
d.meta.runsByRankRange = { "1-500": 2, [`501-${maxRank}`]: 1 };
d.meta.scope = `Tranco ranks 1-${maxRank} (list ${d.meta.tranco.listId}, infrastructure domains filtered), crawled until at least 1,000 sites were readable (classification "measured"). Every crawled site is kept, including walled, robots-excluded and failed ones. Ranks 1-500: two passes (median-of-2 stability in \`stability\`, which covers 1-500 only). Later ranks: single pass. Vertical \`group\` is null outside the hand-curated 500-site groups.`;
writeFileSync(outFile, `${JSON.stringify(d, null, 2)}\n`);
console.log(`Extended study: ${d.sites.length} crawled, ${measured} measured, highest rank ${maxRank}`);
