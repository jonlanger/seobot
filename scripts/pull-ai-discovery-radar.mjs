#!/usr/bin/env node
/**
 * Pull AI Discovery Radar (CC BY 4.0) adoption stats from GitHub raw.
 * No API key. Writes src/content/data/ai-discovery-radar.json
 *
 * Source: https://github.com/flober81/ai-discovery-radar
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = "https://raw.githubusercontent.com/flober81/ai-discovery-radar/main/data/panel-2026-10.json";

const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const json = await res.json();

const routes = (json.routes ?? []).map((r) => ({
  route: r.route,
  tier: r.tier,
  purpose: r.purpose,
  publisher: r.publisher,
  n: r.n,
  count: r.count,
  adoptionShare: r.adoption_share,
  ciLow: r.ci_low,
  ciHigh: r.ci_high,
  states: r.states,
}));

const output = {
  source: "AI Discovery Radar",
  url: "https://github.com/flober81/ai-discovery-radar",
  license: json.license,
  run: json.run,
  measurementWindow: json.measurement_window,
  sampleFrame: json.sample_frame,
  hostsMeasured: json.hosts_measured,
  reachableHosts: json.reachable_hosts,
  pulledAt: new Date().toISOString(),
  routes,
};

const outPath = join(root, "src/content/data/ai-discovery-radar.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${routes.length} routes, ${json.hosts_measured} hosts.`);