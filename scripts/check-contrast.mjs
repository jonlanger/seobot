/**
 * WCAG contrast audit for the semantic design tokens.
 *
 * Parses the @theme (primitives), :root, and .dark token blocks from
 * src/styles/globals.css, converts OKLCH values to sRGB, and checks the
 * contrast of every meaningful foreground/background pairing against WCAG 2.2
 * AA thresholds — plus the sequential ramp's monotonicity and step separation.
 *
 * Run with: npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "styles", "globals.css"), "utf8");

/* ------------------------------- CSS parsing ------------------------------ */

function extractBlock(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) throw new Error(`Could not find "${selector}" in globals.css`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  if (open === -1 || close === -1) throw new Error(`Unbalanced block for "${selector}"`);
  return source.slice(open + 1, close);
}

function parseTokens(block) {
  const tokens = {};
  const re = /--([\w-]+):\s*([^;]+);/g;
  let match;
  while ((match = re.exec(block))) tokens[match[1]] = match[2].trim();
  return tokens;
}

function resolve(tokens, name, depth = 0) {
  if (depth > 10) throw new Error(`Circular reference resolving --${name}`);
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`Token --${name} not found`);
  const varMatch = raw.match(/^var\(--([\w-]+)\)$/);
  if (varMatch) return resolve(tokens, varMatch[1], depth + 1);
  return raw;
}

function parseOklch(value, name) {
  const match = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (!match) throw new Error(`Token --${name}: cannot parse "${value}" as oklch(L C H)`);
  return { L: +match[1], C: +match[2], h: +match[3] };
}

/* ------------------------------ Color math -------------------------------- */

function oklchToLinearRgb({ L, C, h }) {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function relativeLuminance(color) {
  const [r, g, b] = oklchToLinearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function toHex({ L, C, h }) {
  const [r, g, b] = oklchToLinearRgb({ L, C, h }).map((v) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055,
  );
  return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

/* -------------------------------- Checks ---------------------------------- */

/** [foreground, background, minimum-ratio, note] */
const CHECKS = [
  // Text on page/card surfaces — WCAG AA 4.5:1
  ["foreground", "background", 4.5, "body text"],
  ["foreground", "surface", 4.5, "body text on card"],
  ["muted-foreground", "background", 4.5, "secondary text"],
  ["muted-foreground", "surface", 4.5, "secondary text on card"],
  ["muted-foreground", "muted", 4.5, "secondary text on muted"],
  ["accent-foreground", "accent", 4.5, "hover text"],
  ["primary", "background", 4.5, "link text"],
  ["primary", "surface", 4.5, "link text on card"],

  // Solid semantic fills — 4.5:1 against their foreground
  ["primary-foreground", "primary", 4.5, "primary button"],
  ["primary-foreground", "primary-hover", 4.5, "primary button hover"],
  ["destructive-foreground", "destructive", 4.5, "danger button"],
  ["success-foreground", "success", 4.5, "success fill"],
  ["warning-foreground", "warning", 4.5, "warning fill"],
  ["info-foreground", "info", 4.5, "info fill"],

  // Soft semantic fills (badges, alerts) — 4.5:1
  ["primary-soft-foreground", "primary-soft", 4.5, "primary badge"],
  ["destructive-soft-foreground", "destructive-soft", 4.5, "danger badge"],
  ["success-soft-foreground", "success-soft", 4.5, "success badge"],
  ["warning-soft-foreground", "warning-soft", 4.5, "warning badge"],
  ["info-soft-foreground", "info-soft", 4.5, "info badge"],

  // Soft-foregrounds also used as standalone colored text — 4.5:1
  ["primary-soft-foreground", "background", 4.5, "primary text"],
  ["destructive-soft-foreground", "background", 4.5, "danger text"],
  ["success-soft-foreground", "background", 4.5, "success text"],
  ["warning-soft-foreground", "background", 4.5, "warning text"],
  ["info-soft-foreground", "background", 4.5, "info text"],

  // Non-text UI — WCAG 1.4.11 3:1
  ["ring", "background", 3, "focus ring"],

  // Hairlines — decorative, just must be visible (1.2:1)
  ["border", "background", 1.2, "hairline border"],
  ["input", "background", 1.2, "input border"],
  ["input", "surface", 1.2, "input border on card"],
];

// Chart series colors — every series clears 3:1 on the page and card surfaces.
for (let i = 1; i <= 8; i++) {
  CHECKS.push([`chart-${i}`, "background", 3, `chart ${i}`]);
  CHECKS.push([`chart-${i}`, "surface", 3, `chart ${i} on card`]);
}

// `@theme` holds the raw primitives (the brand ramp); `:root` and `.dark` hold
// the semantic tokens that reference them. Merge so var() chains resolve.
const primitives = parseTokens(extractBlock(css, "@theme {"));
const themes = {
  light: { ...primitives, ...parseTokens(extractBlock(css, ":root {")) },
  dark: { ...primitives, ...parseTokens(extractBlock(css, ".dark {")) },
};

let failures = 0;
const rows = [];

for (const [themeName, tokens] of Object.entries(themes)) {
  for (const [fg, bg, min, note] of CHECKS) {
    const fgColor = parseOklch(resolve(tokens, fg), fg);
    const bgColor = parseOklch(resolve(tokens, bg), bg);
    const ratio = contrastRatio(fgColor, bgColor);
    const pass = ratio >= min;
    if (!pass) failures += 1;
    rows.push({
      theme: themeName,
      pair: `${fg} on ${bg}`,
      note,
      ratio: ratio.toFixed(2),
      min,
      status: pass ? "PASS" : "FAIL",
      fgHex: toHex(fgColor),
      bgHex: toHex(bgColor),
    });
  }
}

/* Sequential ramp — steps must move monotonically away from the background
 * (darkening in light mode, brightening in dark mode) with visible
 * separation, and the strongest step must clear 3:1. */
const SEQ_MIN_STEP = 0.035;
for (const [themeName, tokens] of Object.entries(themes)) {
  const ls = [];
  for (let i = 1; i <= 8; i++) {
    ls.push(parseOklch(resolve(tokens, `seq-${i}`), `seq-${i}`).L);
  }

  const brightens = themeName === "dark";
  const monotonic = ls.every((l, i) => (i === 0 ? true : brightens ? l > ls[i - 1] : l < ls[i - 1]));
  const minDelta = Math.min(...ls.slice(1).map((l, i) => Math.abs(l - ls[i])));
  const topRatio = contrastRatio(
    parseOklch(resolve(tokens, "seq-8"), "seq-8"),
    parseOklch(resolve(tokens, "background"), "background"),
  );

  const pass = monotonic && minDelta >= SEQ_MIN_STEP && topRatio >= 3;
  if (!pass) failures += 1;
  rows.push({
    theme: themeName,
    pair: `seq ramp 1→8 (${brightens ? "brightening" : "darkening"})`,
    note: "monotonic · ΔL ≥ 0.035 · strongest ≥ 3:1",
    ratio: minDelta.toFixed(3),
    min: SEQ_MIN_STEP,
    status: pass ? "PASS" : "FAIL",
    fgHex: `ΔL min ${minDelta.toFixed(3)}`,
    bgHex: `top ${topRatio.toFixed(2)}:1`,
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(
  `${pad("theme", 6)} ${pad("pair", 52)} ${pad("ratio", 6)} min   status  swatch`,
);
console.log("-".repeat(96));
for (const row of rows) {
  console.log(
    `${pad(row.theme, 6)} ${pad(row.pair, 52)} ${pad(row.ratio, 6)} ${pad(row.min < 1 ? row.min.toFixed(3) : row.min.toFixed(1), 5)} ${pad(row.status, 7)} ${row.fgHex} on ${row.bgHex}  (${row.note})`,
  );
}

console.log("-".repeat(96));
if (failures > 0) {
  console.error(`${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log(`All ${rows.length} checks passed.`);
}
