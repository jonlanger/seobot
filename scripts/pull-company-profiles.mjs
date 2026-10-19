#!/usr/bin/env node
/**
 * Pull Wikipedia summaries for the companies behind the Tranco top-1000 domains.
 * No API key. Best-effort: derives a search term from the domain's base name.
 * Writes src/content/data/company-profiles.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listFile = JSON.parse(readFileSync(join(root, "tools/crawl/data/top-1000.json"), "utf8"));
const domains = listFile.sites.map((s) => s.domain);

function baseName(domain) {
  const host = domain.replace(/^www\./, "").split(".")[0];
  // Split camelCase / hyphens / underscores into words
  return host
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const outPath = join(root, "src/content/data/company-profiles.json");
// Keep rows from earlier pulls that succeeded; only retry the failures.
const previous = new Map(
  existsSync(outPath)
    ? JSON.parse(readFileSync(outPath, "utf8")).rows.filter((r) => r.found).map((r) => [r.domain, r])
    : [],
);
const todo = domains.filter((d) => !previous.has(d));
const rows = [...previous.values()];
let i = 0;
const concurrency = 2;

const UA = { "User-Agent": "SeobotResearchBot/0.1 (+https://seobot.example/bot)" };

/** GET JSON with backoff on 429/5xx and non-JSON (rate-limit) bodies. */
async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 404) return null;
    if (res.ok) {
      try {
        return await res.json();
      } catch {
        /* HTML rate-limit page — retry */
      }
    }
    await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
  }
  throw new Error(`gave up on ${url}`);
}

async function fetchProfile(domain) {
  const term = titleCase(baseName(domain));
  try {
    const searchJson = await getJson(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`,
    );
    const first = searchJson?.query?.search?.[0];
    if (!first) return { domain, term, found: false };
    const title = first.title;
    const s = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!s) return { domain, term, found: false };
    return {
      domain,
      term,
      found: true,
      title: s.title,
      extract: s.extract ?? null,
      description: s.description ?? null,
      thumbnail: s.thumbnail?.source ?? null,
      url: s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch (e) {
    return { domain, term, found: false, error: String(e).slice(0, 120) };
  }
}

async function worker() {
  while (i < todo.length) {
    const idx = i++;
    const domain = todo[idx];
    const profile = await fetchProfile(domain);
    rows.push(profile);
    // polite pacing
    await new Promise((r) => setTimeout(r, 600));
    if (idx % 25 === 0) console.log(`  ${idx + 1}/${todo.length}`);
  }
}

console.log(`Pulling Wikipedia profiles for ${todo.length} domains (${previous.size} kept from earlier)…`);
await Promise.all(Array.from({ length: concurrency }, worker));

const found = rows.filter((r) => r.found).length;
const output = {
  source: "Wikipedia (public REST + search API)",
  url: "https://en.wikipedia.org/api/rest_v1/",
  license: "CC BY-SA 4.0 (Wikipedia content)",
  pulledAt: new Date().toISOString(),
  total: rows.length,
  found,
  rows: rows.sort((a, b) => a.domain.localeCompare(b.domain)),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — found ${found}/${rows.length}.`);
