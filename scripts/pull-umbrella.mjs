#!/usr/bin/env node
/**
 * Pull Cisco Umbrella Popularity List (top 1M domains) and map ranks for the
 * pinned Tranco top-1000 sites.
 *
 * Source: http://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip
 * (public, no API key). Output: src/content/data/umbrella-ranks.json
 *
 * Run: node scripts/pull-umbrella.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "tools/crawl/out");
const zipPath = join(outDir, "umbrella-top-1m.csv.zip");
const csvPath = join(outDir, "top-1m.csv");
const listFile = JSON.parse(readFileSync(join(root, "tools/crawl/data/top-1000.json"), "utf8"));

mkdirSync(outDir, { recursive: true });

if (!existsSync(zipPath)) {
  console.log("Downloading Umbrella top-1m zip...");
  execSync(`curl -sL -o "${zipPath}" "http://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip"`, { stdio: "inherit" });
}
if (!existsSync(csvPath)) {
  console.log("Unzipping...");
  execSync(`unzip -o -q "${zipPath}" -d "${outDir}"`, { stdio: "inherit" });
}

// Build lookup: domain -> umbrella rank
const lookup = new Map();
const csv = readFileSync(csvPath, "utf8");
for (const line of csv.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [rank, domain] = line.split(",");
  if (!rank || !domain) continue;
  lookup.set(domain.trim().toLowerCase(), Number(rank));
}

const rows = listFile.sites.map((site) => ({
  domain: site.domain,
  trancoRank: site.rank,
  umbrellaRank: lookup.get(site.domain.toLowerCase()) ?? null,
}));

const matched = rows.filter((r) => r.umbrellaRank !== null).length;
const output = {
  source: "Cisco Umbrella Popularity List (top-1m)",
  url: "http://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip",
  pulledAt: new Date().toISOString(),
  matched,
  total: rows.length,
  rows,
};

const outPath = join(root, "src/content/data/umbrella-ranks.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — matched ${matched}/${rows.length} domains.`);
