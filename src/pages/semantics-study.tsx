import { Seo } from "@/components/seo";
import { semanticsStudy } from "@/content/semantics";
import { site } from "@/content/site";

const pageSeo = {
  title: "State of Semantic HTML on Top Sites — Seobot Research",
  description:
    "First-party audit of semantic HTML, page structure, and information architecture on 60 pinned Tranco top-500 sites: raw vs. rendered passes, landmark adoption, heading hierarchy, schema, and metadata.",
  path: "/research/semantics",
};

export function SemanticsStudyPage() {
  const agg = semanticsStudy.aggregate as any;
  const lm = agg.landmarksRaw as Record<string, number>;
  const lmR = agg.landmarksRendered as Record<string, number>;
  const n = agg.sample as number;

  return (
    <>
      <Seo {...pageSeo} />
      <main className="mx-auto max-w-4xl px-6 py-12 grid gap-8">
        <header className="grid gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Research · CC BY 4.0
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            State of Semantic HTML, Page Structure &amp; IA on Top Sites
          </h1>
          <p className="text-base text-muted-foreground max-w-3xl">
            A first-party audit of {n} pinned Tranco top-500 homepages (list{" "}
            <code className="font-mono">{semanticsStudy.meta.runDate}</code>), comparing what a non-rendering client
            receives (raw HTML) against a hydrated browser (rendered DOM). Two back-to-back runs, {semanticsStudy.meta.runs} total.
          </p>
          <p className="text-sm">
            <a
              href="/research/semantics-study.json"
              className="underline underline-offset-4"
              download
            >
              Download dataset (JSON)
            </a>{" "}
            · Methodology &amp; caveats below.
          </p>
        </header>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Headline adoption (raw HTML)</h2>
          <ul className="grid gap-1 text-sm">
            <li>Single H1: {agg.singleH1.raw}/{n}</li>
            <li>Valid heading sequence (no skipped levels): {agg.validHeadingSequence.raw}/{n}</li>
            <li>Multiple H1: {agg.multipleH1.raw}/{n}</li>
            <li>JSON-LD present: {agg.jsonLd.raw}/{n}</li>
            <li>Canonical link: {agg.meta.canonicalRaw}/{n}</li>
            <li>OG title: {agg.meta.ogTitleRaw}/{n} · OG image: {agg.meta.ogImageRaw}/{n}</li>
            <li>Viewport meta: {agg.meta.viewportRaw}/{n} · lang attribute: {agg.meta.langRaw}/{n}</li>
            <li>Skip-to-main link: {agg.meta.skipLinkRaw}/{n}</li>
            <li>Semantic ratio (landmark tags / total elements) median: {agg.semanticRatio.rawMedian}</li>
            <li>Images missing alt: {agg.images.rawNoAlt}/{agg.images.rawTotal}</li>
          </ul>
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Landmark adoption — raw vs. rendered (sites)</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="py-2 pr-4">Landmark</th>
                <th className="py-2 pr-4">Raw</th>
                <th className="py-2 pr-4">Rendered</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(lm).map((k) => (
                <tr key={k} className="border-b border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-xs">{k}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{lm[k]}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{lmR[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Rendered counts are higher — structure that non-rendering AI crawlers (which execute no JavaScript) never see.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Methodology &amp; caveats</h2>
          <ul className="grid gap-1 text-sm text-muted-foreground">
            <li>Sample: {n} of the first 60 entries of Tranco list 64VVX, infrastructure domains filtered.</li>
            <li>Two passes per homepage with the same user agent — plain HTTP parse (JS-disabled context) vs. headless Chromium — so JavaScript execution is the only variable.</li>
            <li>Signals extracted: landmark counts, heading hierarchy, JSON-LD types, meta/OG, alt text, links, images, tables, breadcrumbs, FAQ signals, skip links.</li>
            <li>Homepage only; deep-page (money-page) pass is in progress and will extend breadcrumbs/tables/FAQ adoption numbers.</li>
            <li>Token-set overlap is an upper bound; anti-bot/consent interstitials confound both passes.</li>
            <li>Two back-to-back runs; {agg.stability.sitesStableWithin0_001}/{agg.stability.sitesCompared} sites stable within 0.001 on semantic ratio.</li>
          </ul>
        </section>

        <section className="grid gap-2 text-xs text-muted-foreground">
          <p>
            License: CC BY 4.0 (derived metrics). Source: {semanticsStudy.meta.sourceId}. Cite: “Seobot, State of Semantic
            HTML on Top Sites, {semanticsStudy.meta.runDate}.”
          </p>
          <p>
            Site: {site.name} · {site.url}
          </p>
        </section>
      </main>
    </>
  );
}