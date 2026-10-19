#!/usr/bin/env node
/**
 * Pull Wayback Machine availability + latest snapshot for the pinned top-1000 sites.
 * Writes src/content/data/wayback-freshness.json
 *
 * Source: https://archive.org/wayback/available (no API key).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listFile = JSON.parse(readFileSync(join(root, "tools/crawl/data/top-1000.json"), "utf8"));
const domains = listFile.sites.map((s) => s.domain);

const rows = [];
let i = 0;
const concurrency = 1; // archive.org rate-limits aggressively (HTTP 429)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function lookup(domain) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`);
      if (res.status === 429 || res.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
      const json = await res.json();
      const snap = json?.archived_snapshots?.closest;
      return { domain, available: Boolean(snap?.available), timestamp: snap?.timestamp ?? null, url: snap?.url ?? null, status: snap?.status ?? null };
    } catch { await sleep(2000 * (attempt + 1)); }
  }
  // Not measured: null, never "false" (false would claim the site has no archive).
  return { domain, available: null, timestamp: null, url: null, status: null };
}
async function worker() {
  while (i < domains.length) {
    const domain = domains[i++];
    rows.push(await lookup(domain));
    if (rows.length % 25 === 0) console.log(`${rows.length}/${domains.length}`);
    await sleep(1200);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const output = {
  source: "Wayback Machine (archive.org)",
  url: "https://archive.org/wayback/available",
  pulledAt: new Date().toISOString(),
  rows: rows.sort((a, b) => a.domain.localeCompare(b.domain)),
};

const outPath = join(root, "src/content/data/wayback-freshness.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${rows.length} domains.`);