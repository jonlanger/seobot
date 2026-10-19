/**
 * Build-time prerender (docs/seo-research.md §2.1).
 *
 * Run after `vite build` (client → dist/) and `vite build --ssr` (→ dist-ssr/).
 * Renders each `prerender` route with react-dom/static, moves the hoisted
 * <title>/<meta>/<link> into <head> of the client shell, and writes
 * dist/<route>/index.html. Also emits 404.html (noindex), sitemap.xml, and
 * stamps the real sitemap origin into robots.txt.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const ssrDir = join(root, "dist-ssr");

const { render, routes, companyDomains, companyPath } = await import(pathToFileURL(join(ssrDir, "entry-server.js")).href);
const siteSrc = await readFile(join(root, "src/content/site.ts"), "utf8");
const origin = siteSrc.match(/url:\s*"([^"]+)"/)?.[1] ?? "";

const shell = (await readFile(join(dist, "index.html"), "utf8")).replace(/<title>[\s\S]*?<\/title>\s*/, "");

const HEAD_TAG = /<(title)>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*rel="canonical"[^>]*>/g;

function assemble(markup) {
  const headTags = [];
  const body = markup.replace(HEAD_TAG, (tag) => {
    headTags.push(tag);
    return "";
  });
  if (!headTags.some((tag) => tag.startsWith("<title"))) throw new Error("Prerendered page has no <title>");
  return shell
    .replace("</head>", `${headTags.join("\n    ")}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

async function write(path, html) {
  const file = path === "/" ? join(dist, "index.html") : join(dist, path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  return file;
}

const urls = [];
for (const route of routes.filter((r) => r.prerender)) {
  const html = assemble(await render(route.path));
  if (!/<h1[\s>]/.test(html)) throw new Error(`${route.path}: prerendered HTML has no <h1>`);
  await write(route.path, html);
  urls.push(route.path);
  console.log(`prerendered ${route.path}`);
}

for (const domain of companyDomains) {
  const path = companyPath(domain);
  const html = assemble(await render(path));
  if (!/<h1[\s>]/.test(html)) throw new Error(`${path}: prerendered HTML has no <h1>`);
  await write(path, html);
  urls.push(path);
}
console.log(`prerendered ${companyDomains.length} company pages`);

await writeFile(join(dist, "404.html"), assemble(await render("/__not-found__")));
console.log("prerendered 404.html");

await writeFile(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
);
console.log(`sitemap.xml: ${urls.length} urls`);

await rm(ssrDir, { recursive: true, force: true });
