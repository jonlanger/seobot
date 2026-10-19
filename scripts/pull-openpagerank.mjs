#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.OPENPAGERANK_API_KEY;
if (!key) {
  console.error("OPENPAGERANK_API_KEY not set. Get a free key at https://www.domcop.com/openpagerank/");
  process.exit(0);
}

const listFile = JSON.parse(readFileSync(join(root, "tools/crawl/data/top-1000.json"), "utf8"));
const domains = listFile.sites.map((s) => s.domain);

const rows = [];
const batchSize = 100;
for (let i = 0; i < domains.length; i += batchSize) {
  const batch = domains.slice(i, i + batchSize);
  const url = `https://openpagerank.com/api/v1.0/getPageRank?${batch.map((d) => `domains[]=${encodeURIComponent(d)}`).join("&")}`;
  try {
    const res = await fetch(url, { headers: { "API-OPR": key } });
    const json = await res.json();
    const items = json?.response ?? [];
    const byDomain = new Map(items.map((it) => [String(it.domain).toLowerCase(), it]));
    for (const d of batch) {
      const it = byDomain.get(d.toLowerCase());
      rows.push({
        domain: d,
        pageRankDecimal: it ? Number(it.page_rank_decimal) : null,
        rank: it ? Number(it.rank) : null,
      });
    }
  } catch (e) {
    for (const d of batch) rows.push({ domain: d, pageRankDecimal: null, rank: null });
  }
  await new Promise((r) => setTimeout(r, 1100));
}

const output = {
  source: "Open PageRank (DomCop / Keywords Everywhere)",
  url: "https://openpagerank.com/api/v1.0/getPageRank",
  pulledAt: new Date().toISOString(),
  rows: rows.sort((a, b) => a.domain.localeCompare(b.domain)),
};

const outPath = join(root, "src/content/data/openpagerank.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${rows.length} domains.`);
EOF
echo done