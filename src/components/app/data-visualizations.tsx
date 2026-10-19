import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { topSitesStudy } from "@/content/top-sites";
import type { StudySite } from "@/content/top-sites";
import { semanticsStudy } from "@/content/semantics";
import { enrichmentRows } from "@/content/enrichment";
import { BarGrid3D } from "@/components/app/bar-grid-3d";
import { blockRateMatrix, shortVertical, VERTICALS } from "@/lib/crawler-matrix";
import aiDiscoveryRadar from "@/content/data/ai-discovery-radar.json";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

/* ---------------------------- Constants ---------------------------- */

const CRAWLERS = topSitesStudy.meta.crawlers;

type MatrixView = "3d" | "2d";

/** 2D / 3D switch shared by the matrix views; 2D is the default. */
function ViewToggle({ view, onChange }: { view: MatrixView; onChange: (v: MatrixView) => void }) {
  return (
    <Tabs value={view} onValueChange={(v) => onChange(v as MatrixView)}>
      <TabsList aria-label="Chart dimensions">
        <TabsTrigger value="2d">2D</TabsTrigger>
        <TabsTrigger value="3d">3D</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/* ---------------------------- Crawler Heatmap ---------------------------- */

function CrawlerHeatmap({ onCellClick }: { onCellClick: (title: string, sites: StudySite[]) => void }) {
  const [metric, setMetric] = useState<"block" | "allow">("block");
  const [view, setView] = useState<MatrixView>("2d");

  const verticals = VERTICALS;
  const matrix = useMemo(() => blockRateMatrix(metric), [metric]);
  // 3D layout: crawlers run along the wide axis, verticals into the depth.
  const pctValues = useMemo(() => verticals.map((_, vi) => CRAWLERS.map((_, ci) => matrix[ci][vi].pct)), [matrix, verticals]);

  const maxValue = Math.max(...matrix.flat().map((c) => c.pct), 1);

  return (
    <div className="grid gap-3 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">{topSitesStudy.sites.length} sites</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {topSitesStudy.sites.filter((s) => Object.values(s.robots.verdicts).some((v) => v === "block")).length} with blocks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Tabs value={metric} onValueChange={(v) => setMetric(v as "block" | "allow")}>
            <TabsList aria-label="Metric">
              <TabsTrigger value="block">Blocked</TabsTrigger>
              <TabsTrigger value="allow">Allowed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {view === "3d" ? (
        <BarGrid3D
          className="h-[420px] w-full sm:h-[520px]"
          rowLabels={verticals.map(shortVertical)}
          colLabels={CRAWLERS}
          values={pctValues}
          max={100}
          hue={metric === "block" ? "#ef4444" : "#22c55e"}
          tooltip={(vi, ci) => {
            const cell = matrix[ci]?.[vi];
            return `${CRAWLERS[ci]} in ${verticals[vi]}: ${cell?.count ?? 0}/${cell?.total ?? 0} (${(cell?.pct ?? 0).toFixed(0)}%)`;
          }}
          onCellClick={(vi, ci) => {
            const cell = matrix[ci]?.[vi];
            if (cell) onCellClick(`${CRAWLERS[ci]} in ${verticals[vi]}`, cell.sites);
          }}
        />
      ) : (
      <div className="w-full overflow-x-auto">
        <div className="grid gap-0.5 w-full" style={{ gridTemplateColumns: `120px repeat(${verticals.length}, 1fr)` }}>
          <div className="text-[10px] font-medium text-muted-foreground" />
          {verticals.map((v) => (
            <div key={v} className="text-[9px] font-medium text-muted-foreground text-center px-1 truncate" title={v}>
              {shortVertical(v)}
            </div>
          ))}
          {CRAWLERS.map((crawler, ci) => (
            <div key={crawler} className="contents">
              <div className="text-[10px] font-mono text-muted-foreground pr-2 flex items-center truncate h-8" title={crawler}>
                {crawler}
              </div>
              {verticals.map((v, vi) => {
                const cell = matrix[ci]?.[vi];
                const val = cell?.pct ?? 0;
                const intensity = val / maxValue;
                const bg = metric === "block"
                  ? `rgba(239, 68, 68, ${0.08 + intensity * 0.82})`
                  : `rgba(34, 197, 94, ${0.08 + intensity * 0.82})`;
                return (
                  <button
                    key={`${crawler}-${v}`}
                    type="button"
                    className="h-8 flex items-center justify-center text-[10px] font-mono rounded-sm transition-transform hover:scale-110 hover:z-10 focus:ring-1 focus:ring-primary"
                    style={{ backgroundColor: bg }}
                    title={`${crawler} in ${v}: ${cell?.count ?? 0}/${cell?.total ?? 0} (${val.toFixed(0)}%) — click for details`}
                    onClick={() => cell && onCellClick(`${crawler} in ${v}`, cell.sites)}
                  >
                    {val > 3 ? `${Math.round(val)}%` : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      )}
      <p className="text-xs text-muted-foreground">
        Percentage of sites in each vertical that {metric === "block" ? "block" : "allow"} each crawler.
        Click any {view === "3d" ? "bar" : "cell"} to see the specific companies. {view === "3d" ? "Taller" : "Darker"} = higher {metric} rate.
        {view === "3d" && " Drag to rotate."}
      </p>
    </div>
  );
}

/* ---------------------------- Crawler Co-blocking Matrix ---------------------------- */

function CrawlerCoblocking({ onCellClick }: { onCellClick: (title: string, sites: StudySite[]) => void }) {
  const [view, setView] = useState<MatrixView>("2d");
  const matrix = useMemo(() => {
    const result: number[][] = [];
    for (let i = 0; i < CRAWLERS.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < CRAWLERS.length; j++) {
        const count = topSitesStudy.sites.filter((s) => {
          return s.robots.verdicts[CRAWLERS[i]] === "block" && s.robots.verdicts[CRAWLERS[j]] === "block";
        }).length;
        row.push(count);
      }
      result.push(row);
    }
    return result;
  }, []);

  const maxVal = Math.max(...matrix.flat(), 1);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">{CRAWLERS.length} crawlers</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {Math.max(...matrix.flat())} max co-blocks
          </span>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <p className="text-xs text-muted-foreground">
        How many sites block each pair of crawlers simultaneously. {view === "3d" ? "Taller = more co-blocking. Drag to rotate." : "Darker = more co-blocking."}
      </p>
      {view === "3d" ? (
        <BarGrid3D
          className="h-[420px] w-full sm:h-[520px]"
          rowLabels={CRAWLERS}
          colLabels={CRAWLERS}
          values={matrix}
          hue="#6366f1"
          tooltip={(r, c) => `${CRAWLERS[r]} & ${CRAWLERS[c]}: ${matrix[r]?.[c] ?? 0} sites`}
          onCellClick={(r, c) => {
            const sites = topSitesStudy.sites.filter((s) => s.robots.verdicts[CRAWLERS[r]] === "block" && s.robots.verdicts[CRAWLERS[c]] === "block");
            onCellClick(`${CRAWLERS[r]} & ${CRAWLERS[c]}`, sites);
          }}
        />
      ) : (
      <div className="w-full overflow-x-auto">
        <div className="grid gap-px w-full" style={{ gridTemplateColumns: `90px repeat(${CRAWLERS.length}, 1fr)` }}>
          <div />
          {CRAWLERS.map((c) => (
            <div key={c} className="text-[8px] font-mono text-muted-foreground text-center px-0.5 truncate" title={c}>
              {c.slice(0, 6)}
            </div>
          ))}
          {CRAWLERS.map((rowCrawler, ri) => (
            <div key={rowCrawler} className="contents">
              <div className="text-[8px] font-mono text-muted-foreground pr-1 flex items-center truncate h-6" title={rowCrawler}>
                {rowCrawler.slice(0, 8)}
              </div>
              {CRAWLERS.map((colCrawler, ci) => {
                const val = matrix[ri]?.[ci] ?? 0;
                const intensity = val / maxVal;
                return (
                  <button
                    key={`${ri}-${ci}`}
                    type="button"
                    className="h-6 flex items-center justify-center text-[7px] font-mono rounded-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: `rgba(99, 102, 241, ${0.05 + intensity * 0.85})` }}
                    title={`${rowCrawler} & ${colCrawler}: ${val} sites — click for companies`}
                    onClick={() => {
                      const sites = topSitesStudy.sites.filter((s) => s.robots.verdicts[rowCrawler] === "block" && s.robots.verdicts[colCrawler] === "block");
                      onCellClick(`${rowCrawler} & ${colCrawler}`, sites);
                    }}
                  >
                    {val > 0 ? val : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

/* ---------------------------- Anti-Bot Radar (Recharts) ---------------------------- */

function AntiBotRadar() {
  const verticals = topSitesStudy.groups.map((g) => g.name);

  const data = verticals.map((v) => {
    const sites = topSitesStudy.sites.filter((s) => s.group === v);
    const n = sites.length || 1;
    return {
      vertical: v.replace(" & media", "").replace(" & education", "").replace(" & entertainment", "").replace(" & dev", ""),
      "Robots.txt exclusion": Math.round(sites.filter((s) => s.classification === "robots_excluded").length / n * 100),
      "HTTP block": Math.round(sites.filter((s) => s.classification === "raw_blocked" || s.classification === "both_blocked").length / n * 100),
      "Anti-bot interstitial": Math.round(sites.filter((s) => s.metrics?.challengeLike).length / n * 100),
      "Render failure": Math.round(sites.filter((s) => s.classification === "render_failed" || s.classification === "render_incomplete").length / n * 100),
      "AI crawler block": Math.round(sites.filter((s) => ["GPTBot", "OAI-SearchBot", "ClaudeBot"].some((t) => s.robots.verdicts[t] === "block")).length / n * 100),
    };
  });

  const colors = ["#22c55e", "#f97316", "#3b82f6", "#a855f7", "#eab308", "#ef4444", "#06b6d4", "#ec4899"];

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">{verticals.length} verticals</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {Math.round(verticals.reduce((sum, v) => {
              const sites = topSitesStudy.sites.filter((s) => s.group === v);
              return sum + sites.filter((s) => ["GPTBot", "OAI-SearchBot", "ClaudeBot"].some((t) => s.robots.verdicts[t] === "block")).length / (sites.length || 1) * 100;
            }, 0) / verticals.length)}% avg AI block rate
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Each polygon = one vertical. Axes show % of sites in that vertical hitting each barrier type.
      </p>
      <div className="w-full" style={{ height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
            <PolarAngleAxis dataKey="vertical" tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "currentColor", fontSize: 9, opacity: 0.5 }} />
            {["Robots.txt exclusion", "HTTP block", "Anti-bot interstitial", "Render failure", "AI crawler block"].map((key, i) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.1}
                strokeWidth={1.5}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ fontWeight: 600 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------------- JSON-LD (Recharts) ---------------------------- */

function JsonLdSankey() {
  const measured = topSitesStudy.sites.filter((s) => s.metrics);
  const hasRaw = measured.filter((s) => (s.metrics?.jsonLdRaw.length ?? 0) > 0).length;
  const hasRendered = measured.filter((s) => (s.metrics?.jsonLdRendered.length ?? 0) > 0).length;
  const serverSide = measured.filter((s) => (s.metrics?.jsonLdRendered.length ?? 0) > 0 && (s.metrics?.jsonLdMissingFromRaw.length ?? 0) === 0).length;
  const clientOnly = measured.filter((s) => (s.metrics?.jsonLdMissingFromRaw.length ?? 0) > 0).length;
  const none = measured.filter((s) => (s.metrics?.jsonLdRendered.length ?? 0) === 0).length;
  const total = measured.length;

  const jsonLdPairs = measured.map((s) => [s.metrics?.jsonLdRendered.length ?? 0, s.coverage ?? 0] as [number, number]);
  const n = jsonLdPairs.length;
  const meanX = jsonLdPairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = jsonLdPairs.reduce((sum, [, y]) => sum + y, 0) / n;
  let cov = 0, varX = 0, varY = 0;
  for (const [x, y] of jsonLdPairs) { cov += (x - meanX) * (y - meanY); varX += (x - meanX) ** 2; varY += (y - meanY) ** 2; }
  const jsonLdR = cov / Math.sqrt(varX * varY || 1);

  const typeCounts = new Map<string, number>();
  for (const s of measured) {
    for (const t of s.metrics?.jsonLdRendered ?? []) {
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
  }
  const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const chartData = [
    { name: "In Raw HTML", value: hasRaw, fill: "#f97316" },
    { name: "After Render", value: hasRendered, fill: "#22c55e" },
    { name: "Client-Only", value: clientOnly, fill: "#a855f7" },
    { name: "Server-Side", value: serverSide, fill: "#3b82f6" },
    { name: "No JSON-LD", value: none, fill: "#71717a" },
  ];

  return (
    <div className="grid gap-4">
      <div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">{total} readable sites</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {serverSide} server-side · {clientOnly} client-only
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          How structured data (Schema.org types) flows from raw HTML to rendered DOM across {total} readable sites.
          Critical for AI search engines and rich snippets.
        </p>
      </div>

      <div className="w-full" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }} width={110} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: any) => [`${value} sites (${((value / total) * 100).toFixed(0)}%)`, ""]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {topTypes.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h4 className="text-sm font-medium mb-3">Top Schema.org Types (rendered)</h4>
          <div className="flex flex-wrap gap-2">
            {topTypes.map(([type, count]) => (
              <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
                <span className="font-mono font-medium">{type}</span>
                <span className="text-muted-foreground">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-muted/60 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Key insight:</span> JSON-LD presence and content coverage
          are nearly independent (r = {jsonLdR.toFixed(2)}). Schema is a table stake for AI search, but it's
          not a substitute for readable content. {serverSide} sites get it right by declaring structured
          data server-side, while {clientOnly} sites risk being invisible to AI engines that don't execute
          JavaScript.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------- Raw vs Rendered (Recharts) ---------------------------- */

function RawVsRenderedLollipop() {
  const sites = topSitesStudy.sites
    .filter((s) => s.metrics)
    .map((s) => ({
      domain: s.domain.length > 18 ? s.domain.slice(0, 16) + "…" : s.domain,
      raw: s.metrics!.rawWords,
      rendered: s.metrics!.renderedWords,
      gap: s.metrics!.renderedWords - s.metrics!.rawWords,
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 20);

  return (
    <div className="grid gap-3">
      <div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">Top 20 by JS-added words</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {topSitesStudy.sites.filter((s) => s.metrics).reduce((sum, s) => sum + (s.metrics?.renderedWords ?? 0) - (s.metrics?.rawWords ?? 0), 0).toLocaleString()} total gap words
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          How many words are completely invisible to static scrapers/crawlers until JavaScript executes.
          Each bar shows raw HTML (gray) vs. the JS-added gap (blue).
        </p>
      </div>
      <div className="w-full" style={{ height: 600 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sites} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis type="number" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
            <YAxis type="category" dataKey="domain" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} width={120} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} words`, name === "raw" ? "Raw HTML" : "JS-added gap"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span className="text-muted-foreground">{value === "raw" ? "Raw HTML" : "JS-added gap"}</span>}
            />
            <Bar dataKey="raw" stackId="words" fill="#71717a" fillOpacity={0.5} name="raw" />
            <Bar dataKey="gap" stackId="words" fill="#3b82f6" name="gap" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing top 20 sites by JS-added word count. The blue gap represents content that AI crawlers
        (which don't execute JavaScript) never see.
      </p>
    </div>
  );
}

/* ---------------------------- Additional signals ---------------------------- */

function AdditionalSignals() {
  const measured = topSitesStudy.sites.filter((s) => s.metrics);

  const headingCoverageValues = measured
    .map((s) => s.metrics?.headingsCoverage)
    .filter((v): v is number => v !== null && v !== undefined);
  const medianHeadings =
    headingCoverageValues.length === 0
      ? 0
      : [...headingCoverageValues].sort((a, b) => a - b)[Math.floor(headingCoverageValues.length / 2)];

  const titleDiffers = measured.filter((s) => s.metrics?.titleDiffers).length;
  const challengeLike = measured.filter((s) => s.metrics?.challengeLike).length;
  const cjk = measured.filter((s) => s.metrics?.cjk).length;
  const jsonLdClientOnly = measured.filter((s) => (s.metrics?.jsonLdMissingFromRaw.length ?? 0) > 0).length;

  const verticalHeadings = topSitesStudy.groups.map((g) => {
    const sites = topSitesStudy.sites.filter((s) => s.group === g.name && s.metrics);
    const vals = sites
      .map((s) => s.metrics?.headingsCoverage)
      .filter((v): v is number => v !== null && v !== undefined);
    const med = vals.length === 0 ? 0 : [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    return { name: g.name.replace(" & media", "").replace(" & education", "").replace(" & entertainment", "").replace(" & dev", ""), median: med };
  });

  const radarRoutes = (aiDiscoveryRadar as { routes: Array<{ route: string; adoptionShare: number; n: number }> }).routes
    .filter((r) => ["/robots.txt", "/sitemap.xml", "/llms.txt", "/ai.txt", "/tdmrep.json"].includes(r.route))
    .map((r) => ({ name: r.route, adoption: Math.round(r.adoptionShare * 100), n: r.n }));

  const umbrellaDeltas = enrichmentRows
    .filter((r) => r.umbrellaRank !== null)
    .map((r) => Math.abs(r.trancoRank - (r.umbrellaRank as number)));
  const medianDelta =
    umbrellaDeltas.length === 0
      ? 0
      : [...umbrellaDeltas].sort((a, b) => a - b)[Math.floor(umbrellaDeltas.length / 2)];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Median headings in raw HTML</div>
          <div className="numeric text-lg font-medium">{medianHeadings}%</div>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Raw title differs</div>
          <div className="numeric text-lg font-medium">{titleDiffers}</div>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Interstitial-like passes</div>
          <div className="numeric text-lg font-medium">{challengeLike}</div>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <div className="text-xs text-muted-foreground">CJK-dominant pages</div>
          <div className="numeric text-lg font-medium">{cjk}</div>
        </div>
      </div>

      {radarRoutes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Discovery-file adoption (AI Discovery Radar)</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Share of measured hosts publishing each file. llms.txt adoption is low — most "AI-ready" claims are aspirational.
          </p>
          <div className="w-full" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radarRoutes} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
                <YAxis tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any, _name: any, props: any) => [`${value}% (n=${props?.payload?.n ?? "—"})`, "Adoption"]}
                />
                <Bar dataKey="adoption" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium mb-2">Median heading coverage by vertical</h4>
        <p className="text-xs text-muted-foreground mb-3">
          How much of the rendered heading structure survives into raw HTML. Low values mean AI crawlers lose navigation context.
        </p>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={verticalHeadings} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
              <YAxis tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(value: any) => [`${value}%`, "Median heading coverage"]}
              />
              <Bar dataKey="median" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg bg-muted/60 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Rank-list agreement:</span> among the {enrichmentRows.filter((r) => r.umbrellaRank !== null).length} sites with an
          Umbrella rank, the median absolute gap vs. Tranco is {medianDelta} positions.{" "}
          {jsonLdClientOnly} readable sites declare at least one JSON-LD type only after JavaScript.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------- GEO readiness simulator ---------------------------- */

const GEO_WEIGHTS: Record<string, Record<string, number>> = {
  Google: { Access: 0.22, Render: 0.10, Extract: 0.22, Evidence: 0.18, Entity: 0.12, Freshness: 0.16 },
  ChatGPT: { Access: 0.26, Render: 0.20, Extract: 0.16, Evidence: 0.16, Entity: 0.12, Freshness: 0.10 },
  Copilot: { Access: 0.26, Render: 0.20, Extract: 0.15, Evidence: 0.16, Entity: 0.12, Freshness: 0.11 },
  Perplexity: { Access: 0.24, Render: 0.18, Extract: 0.16, Evidence: 0.15, Entity: 0.12, Freshness: 0.15 },
  Claude: { Access: 0.22, Render: 0.20, Extract: 0.20, Evidence: 0.16, Entity: 0.10, Freshness: 0.12 },
};

const GEO_DIMS = ["Access", "Render", "Extract", "Evidence", "Entity", "Freshness"] as const;

function GeoReadinessSimulator() {
  const [scores, setScores] = useState<Record<string, number>>({
    Access: 72, Render: 12, Extract: 45, Evidence: 22, Entity: 28, Freshness: 48,
  });
  const [engines, setEngines] = useState<Record<string, boolean>>({
    Google: true, ChatGPT: true, Copilot: true, Perplexity: true, Claude: true,
  });

  const selected = Object.keys(engines).filter((e) => engines[e]);
  const perEngine = selected.map((e) => {
    const w = GEO_WEIGHTS[e];
    const score = GEO_DIMS.reduce((sum, d) => sum + (w[d] ?? 0) * scores[d], 0);
    return { engine: e, score: Math.round(score) };
  });
  const overall = selected.length === 0 ? 0 : Math.round(perEngine.reduce((s, e) => s + e.score, 0) / selected.length);

  const band = overall >= 85 ? "Durable" : overall >= 65 ? "Citation-ready" : overall >= 40 ? "Foundation" : "At risk";

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Drag the six dimension scores to see how GEO readiness moves per engine. Weights are the v0 priors from the GEO recommendation engine (calibrated later).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {GEO_DIMS.map((d) => (
          <label key={d} className="grid gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{d}</span>
              <span className="numeric text-muted-foreground">{scores[d]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={scores[d]}
              onChange={(e) => setScores((prev) => ({ ...prev, [d]: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.keys(GEO_WEIGHTS).map((e) => (
          <label key={e} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={engines[e]}
              onChange={(ev) => setEngines((prev) => ({ ...prev, [e]: ev.target.checked }))}
            />
            <span className="font-medium">{e}</span>
            {engines[e] && (
              <span className="numeric text-muted-foreground">
                {perEngine.find((p) => p.engine === e)?.score ?? "—"}
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-baseline gap-3">
          <span className="numeric text-3xl font-semibold">{overall}</span>
          <span className="text-sm text-muted-foreground">/ 100 · {band}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Per-engine scores above. Gates (robots blocks, JS-only content, stale entity) floor Access at 5 and pin a red flag.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------- Semantics & IA adoption ---------------------------- */

function SemanticsAdoption() {
  const agg = semanticsStudy.aggregate as any;
  const rawN = agg.sample;
  const landmarkData = Object.keys(agg.landmarksRaw).map((k) => ({
    name: k,
    raw: agg.landmarksRaw[k],
    rendered: agg.landmarksRendered[k],
  }));
  const metaData = [
    { name: "Canonical", value: agg.meta.canonicalRaw },
    { name: "OG title", value: agg.meta.ogTitleRaw },
    { name: "OG desc", value: agg.meta.ogDescRaw },
    { name: "OG image", value: agg.meta.ogImageRaw },
    { name: "Viewport", value: agg.meta.viewportRaw },
    { name: "Lang", value: agg.meta.langRaw },
    { name: "Skip link", value: agg.meta.skipLinkRaw },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Sites audited</div>
          <div className="text-2xl font-bold tabular-nums">{rawN}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Single H1 (raw)</div>
          <div className="text-2xl font-bold tabular-nums">{agg.singleH1.raw}</div>
          <div className="text-[10px] text-muted-foreground">rendered {agg.singleH1.rendered}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Valid heading seq (raw)</div>
          <div className="text-2xl font-bold tabular-nums">{agg.validHeadingSequence.raw}</div>
          <div className="text-[10px] text-muted-foreground">rendered {agg.validHeadingSequence.rendered}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">JSON-LD (raw)</div>
          <div className="text-2xl font-bold tabular-nums">{agg.jsonLd.raw}</div>
          <div className="text-[10px] text-muted-foreground">rendered {agg.jsonLd.rendered}</div>
        </div>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Landmark adoption — raw vs. rendered (sites)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={landmarkData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="raw" name="Raw HTML" fill="#71717a" fillOpacity={0.7} />
              <Bar dataKey="rendered" name="Rendered DOM" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground">
          Landmark counts are higher in the rendered DOM — structure that AI crawlers (which execute no JS) never see.
        </p>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Metadata & social-card adoption (raw HTML, sites)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metaData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Sites" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
        Semantic ratio (landmark tags / total elements) median: {agg.semanticRatio.rawMedian} raw · {agg.semanticRatio.renderedMedian} rendered.
        Images missing alt: {agg.images.rawNoAlt}/{agg.images.rawTotal} raw ({((agg.images.rawNoAlt / agg.images.rawTotal) * 100).toFixed(1)}%) ·{" "}
        {agg.images.renderedNoAlt}/{agg.images.renderedTotal} rendered.
        Skip links: {agg.meta.skipLinkRaw}/{agg.sample}. Source: {semanticsStudy.meta.sourceId} · {semanticsStudy.meta.runDate} · CC BY 4.0.
      </div>
    </div>
  );
}

/** Title + description per visualization; the dashboard renders them in its page header. */
export const vizIntros: Record<string, { title: string; description: string }> = {
  crawler: {
    title: "Crawler × Vertical Block Rate",
    description: "Which AI crawlers are blocked or allowed by which industry verticals.",
  },
  coblocking: {
    title: "Crawler Co-blocking Matrix",
    description: "How many sites block each pair of crawlers simultaneously.",
  },
  radar: {
    title: "Anti-Bot Barriers by Vertical",
    description: "Multi-axis radar comparing security postures across industries.",
  },
  jsonld: {
    title: "JSON-LD Structured Data Flow",
    description: "How Schema.org structured data flows from raw HTML to rendered DOM.",
  },
  lollipop: {
    title: "Client-Side Rendering Gap",
    description: "How many words are completely invisible to static scrapers/crawlers until JavaScript executes.",
  },
  signals: {
    title: "Additional Signals",
    description: "Headings, titles, interstitials, CJK pages, discovery-file adoption, and rank-list agreement — metrics we already collect but hadn't charted.",
  },
  geo: {
    title: "GEO Readiness Simulator",
    description: "Weighted per-engine readiness from the six citation-pipeline dimensions, with v0 priors.",
  },
  semantics: {
    title: "Semantics & IA Adoption",
    description: "How top sites use semantic HTML landmarks, heading hierarchy, schema, and metadata — raw vs. rendered.",
  },
};

export function DataVisualizations({ activeViz: controlledViz, onOpenDetail }: { activeViz?: "crawler" | "coblocking" | "radar" | "jsonld" | "lollipop" | "signals" | "geo" | "semantics"; onOpenDetail?: (detail: { title: string; sites: StudySite[] }) => void }) {
  const activeViz = controlledViz ?? "crawler";


  const handleCellClick = (title: string, sites: StudySite[]) => {
    onOpenDetail?.({ title, sites });
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        {activeViz === "crawler" && <CrawlerHeatmap onCellClick={handleCellClick} />}
        {activeViz === "coblocking" && <CrawlerCoblocking onCellClick={handleCellClick} />}
        {activeViz === "radar" && <AntiBotRadar />}
        {activeViz === "jsonld" && <JsonLdSankey />}
        {activeViz === "lollipop" && <RawVsRenderedLollipop />}
        {activeViz === "signals" && <AdditionalSignals />}
        {activeViz === "geo" && <GeoReadinessSimulator />}
        {activeViz === "semantics" && <SemanticsAdoption />}
      </div>
    </div>
  );
}