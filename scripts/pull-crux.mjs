#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.CRUX_API_KEY;
if (!key) {
  console.error("CRUX_API_KEY not set. Get one at https://goo.gle/crux-api-key");
  process.exit(0);
}

const listFile = JSON.parse(readFileSync(join(root, "tools/crawl/data/top-1000.json"), "utf8"));
const domains = listFile.sites.map((s) => s.domain);

const rows = [];
const concurrency = 5;
let i = 0;
async function worker() {
  while (i < domains.length) {
    const idx = i++;
    const domain = domains[idx];
    try {
      const res = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: `https://${domain}` }),
      });
      const json = await res.json();
      const m = json?.record?.metrics ?? {};
      const p75 = (metric) => (metric?.percentiles?.p75 ?? null);
      rows.push({
        domain,
        lcpP75: p75(m.largest_contentful_paint),
        clsP75: p75(m.cumulative_layout_shift),
        inpP75: p75(m.interaction_to_next_paint),
        status: res.status,
      });
    } catch (e) {
      rows.push({ domain, lcpP75: null, clsP75: null, inpP75: null, status: 0 });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const output = {
  source: "CrUX (Chrome UX Report) API",
  url: "https://chromeuxreport.googleapis.com/v1/records:queryRecord",
  pulledAt: new Date().toISOString(),
  rows: rows.sort((a, b) => a.domain.localeCompare(b.domain)),
};

const outPath = join(root, "src/content/data/crux-cwv.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${rows.length} domains.`);
EOF
echo done