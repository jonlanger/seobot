import { AlertTriangle, CheckCircle2, ExternalLink, Info, OctagonAlert } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ProgressRing,
} from "@/components/ui";
import {
  companyDeepDive,
  companyFindings,
  companyNeighbors,
  crawlerPolicy,
  peerComparison,
  sortFindings,
} from "@/content/companies";
import type { FindingSeverity } from "@/content/companies";
import { classificationMeta, verdictMeta, verdictBadgeVariant, crawlerGroups } from "@/content/top-sites";
import { enrichmentFor } from "@/content/enrichment";

const severityMeta: Record<FindingSeverity, { icon: ReactNode; tone: "danger" | "warning" | "success" | "info"; label: string }> = {
  critical: { icon: <OctagonAlert className="size-4" />, tone: "danger", label: "Critical" },
  warning: { icon: <AlertTriangle className="size-4" />, tone: "warning", label: "Warning" },
  info: { icon: <Info className="size-4" />, tone: "info", label: "Note" },
  good: { icon: <CheckCircle2 className="size-4" />, tone: "success", label: "Good" },
};

export function CompanyDeepDive({
  domain,
  onOpenCompany,
  onOpenSeoCheck,
}: {
  domain: string;
  onOpenCompany?: (domain: string) => void;
  onOpenSeoCheck?: () => void;
}) {
  const { site, profile, enrichment, structured, deepPage, signals, agent } = useMemo(
    () => companyDeepDive(domain),
    [domain],
  );
  const enr = enrichment ?? (site ? enrichmentFor(domain, site.rank) : null);

  if (!site) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        No study data for {domain}.
      </div>
    );
  }

  const meta = classificationMeta[site.classification];
  const metrics = site.metrics;
  const peers = peerComparison(site);
  const policy = crawlerPolicy(site);
  const findings = sortFindings(companyFindings(site));
  const neighbors = companyNeighbors(site);
  const companyLink = (d: string) => (event: React.MouseEvent) => {
    if (!onOpenCompany) return;
    event.preventDefault();
    onOpenCompany(d);
  };

  return (
    <div className="grid gap-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{site.domain}</span>
            <Badge variant={meta.tone} size="sm" dot>
              {meta.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[auto_1fr]">
          {profile?.thumbnail && (
            <div className="px-0 pt-0">
              <img
                src={profile.thumbnail}
                alt={profile.title ?? site.domain}
                className="h-32 w-32 rounded-lg object-cover"
              />
            </div>
          )}
          <div className="grid gap-2">
            <h1 className="text-lg font-semibold">{profile?.title ?? site.domain}</h1>
            {profile?.description && (
              <p className="text-sm text-muted-foreground">{profile.description}</p>
            )}
            {profile?.extract && (
              <p className="text-sm leading-relaxed">{profile.extract}</p>
            )}
            {profile?.url && (
              <a
                href={profile.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                <ExternalLink className="size-3.5" /> Source: Wikipedia
              </a>
            )}
            {!profile?.found && (
              <p className="text-xs text-muted-foreground">
                No Wikipedia article matched — profile data unavailable.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Findings */}
      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key findings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {findings.map((f) => {
              const sev = severityMeta[f.severity];
              return (
                <div key={f.id} className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                  <Badge variant={sev.tone} size="sm" className="mt-0.5 shrink-0">
                    {sev.icon}
                    {sev.label}
                  </Badge>
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium">{f.title}</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">{f.detail}</span>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Rule-based from the study's measurements of this homepage — not a full audit.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI crawler policy + peer comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI crawler policy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">{policy.headline}</p>
            <dl className="grid grid-cols-2 gap-2.5">
              <Fact label="AI retrieval crawlers" value={`${policy.retrieval.block} blocked · ${policy.retrieval.allow} allowed`} hint={`${policy.retrieval.partial} partial · ${policy.retrieval.unset} unset (of ${policy.retrieval.total})`} />
              <Fact label="Training & policy crawlers" value={`${policy.training.block} blocked · ${policy.training.allow} allowed`} hint={`${policy.training.partial} partial · ${policy.training.unset} unset (of ${policy.training.total})`} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it compares</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {site.coverage !== null && peers.percentile !== null ? (
              <p className="text-sm">
                Serves more of its content in raw HTML than <span className="numeric font-medium">{peers.percentile}%</span> of
                the readable sites in the study.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not readable without a browser, so there is no coverage to rank.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2.5">
              <Fact label="This site" value={site.coverage !== null ? `${site.coverage}%` : "—"} />
              <Fact label="Study median" value={`${peers.overallMedian}%`} />
              {peers.groupName && peers.groupMedian !== null && (
                <Fact label={`${peers.groupName} median`} value={`${peers.groupMedian}%`} hint={`${peers.groupMeasured} readable sites`} />
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* SEO & GEO deep dive */}
      <Card>
        <CardHeader>
          <CardTitle>SEO &amp; GEO deep dive</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center gap-5">
            {site.coverage !== null ? (
              <ProgressRing value={site.coverage} size={88} strokeWidth={8}>
                <span className="numeric font-mono text-lg font-medium">{site.coverage}%</span>
              </ProgressRing>
            ) : (
              <div className="grid size-22 place-items-center rounded-full border border-border text-xs text-muted-foreground">
                n/a
              </div>
            )}
            <div className="grid gap-1">
              <span className="text-sm font-medium">AI-visible content (raw vs. rendered)</span>
              <span className="text-xs text-muted-foreground">
                {metrics
                  ? `${metrics.rawWords} raw tokens · ${metrics.renderedWords} rendered tokens`
                  : "No coverage measurement"}
              </span>
              <span className="text-xs text-muted-foreground">
                Tranco rank #{site.rank} · {site.group ?? "No vertical"} · {meta.description}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-medium">robots.txt policy</h3>
            <p className="text-xs text-muted-foreground">
              {site.robots.status > 0 ? `HTTP ${site.robots.status}` : "No response"} · wildcard:{" "}
              {verdictMeta[site.robots.wildcard].label}
            </p>
            <div className="grid gap-2">
              {crawlerGroups.map((group) => (
                <div key={group.id} className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                  <ul className="flex flex-wrap gap-1.5">
                    {group.tokens.map((token) => (
                      <li key={token}>
                        <Badge
                          variant={verdictBadgeVariant[site.robots.verdicts[token] ?? "unset"]}
                          size="sm"
                        >
                          <span className="font-mono">{token}</span>
                          <span className="opacity-40">·</span>
                          {verdictMeta[site.robots.verdicts[token] ?? "unset"].label}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {metrics && (
            <dl className="grid grid-cols-2 gap-2.5">
              <Fact label="Headings in raw HTML" value={metrics.headingsCoverage !== null ? `${metrics.headingsCoverage}%` : "—"} />
              <Fact
                label="JSON-LD types"
                value={metrics.jsonLdRendered.length > 0 ? metrics.jsonLdRendered.length : "None"}
                hint={
                  metrics.jsonLdMissingFromRaw.length > 0
                    ? `${metrics.jsonLdMissingFromRaw.join(", ")} — only after JS`
                    : "all declared server-side"
                }
              />
              <Fact
                label="Raw <title>"
                value={metrics.titleDiffers ? "Differs from rendered" : "Matches rendered"}
              />
              <Fact
                label="Flags"
                value={
                  [
                    metrics.challengeLike ? "Interstitial-like browser pass" : null,
                    metrics.cjk ? "CJK bigrams" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "None"
                }
              />
            </dl>
          )}

          {enr && (enr.umbrellaRank !== null || enr.openPageRank?.pageRankDecimal != null || enr.crux) && (
            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Cross-source enrichment</h3>
              <dl className="grid grid-cols-2 gap-2.5">
                {enr.umbrellaRank !== null && <Fact label="Umbrella rank" value={enr.umbrellaRank} />}
                {enr.openPageRank?.pageRankDecimal != null && (
                  <Fact label="Open PageRank" value={enr.openPageRank.pageRankDecimal} />
                )}
                {enr.crux?.lcpP75 != null && <Fact label="CrUX LCP p75 (ms)" value={enr.crux.lcpP75} />}
                {enr.crux?.clsP75 != null && <Fact label="CrUX CLS p75" value={enr.crux.clsP75} />}
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structured data */}
      {structured?.measured && (
        <Card>
          <CardHeader>
            <CardTitle>Structured data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ul className="flex flex-wrap gap-1.5">
              {(
                [
                  ["Organization", structured.hasOrganization],
                  ["WebSite", structured.hasWebSite],
                  ["BreadcrumbList", structured.hasBreadcrumb],
                  ["FAQPage", structured.hasFaq],
                  ["Product", structured.hasProduct],
                  ["Article", structured.hasArticle],
                ] as const
              ).map(([label, present]) => (
                <li key={label}>
                  <Badge variant={present ? "success" : "neutral"} size="sm">
                    <span className="font-mono">{label}</span>
                    <span className="opacity-40">·</span>
                    {present ? "Present" : "Absent"}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {structured.typeCountRaw > 0
                ? `${structured.typeCountRaw} JSON-LD type${structured.typeCountRaw === 1 ? "" : "s"} in the raw HTML: ${structured.typesRaw.join(", ")}.`
                : "No JSON-LD in the raw HTML."}
              {structured.typesMissingFromRaw.length > 0 &&
                ` Added only by JavaScript: ${structured.typesMissingFromRaw.join(", ")}.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inner page */}
      {deepPage && (
        <Card>
          <CardHeader>
            <CardTitle>Beyond the homepage</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="break-all text-xs text-muted-foreground">
              Sampled inner page: <span className="font-mono">{deepPage.url}</span>
            </p>
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Fact
                label="Raw HTML coverage"
                value={deepPage.coverage !== null ? `${deepPage.coverage}%` : "—"}
                hint={site.coverage !== null ? `homepage ${site.coverage}%` : undefined}
              />
              <Fact label="H1 count" value={deepPage.h1Count} hint={deepPage.headingSequenceValid ? "valid heading order" : "heading order skips levels"} />
              <Fact label="Images with alt text" value={deepPage.imagesWithAltPct !== null ? `${deepPage.imagesWithAltPct}%` : "—"} />
              <Fact label="Internal links" value={deepPage.internalLinks} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Site signals & agent readiness */}
      {(signals || agent) && (
        <Card>
          <CardHeader>
            <CardTitle>Technical &amp; agent signals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {signals && (
              <dl className="contents">
                <Fact label="Server response (TTFB)" value={signals.ttfbMs !== null ? `${signals.ttfbMs} ms` : "—"} />
                <Fact label="CDN" value={signals.cdn ?? "Not detected"} />
                <Fact label="Sitemap" value={signals.hasSitemap ? (signals.sitemapInRobots ? "Yes, in robots.txt" : "Yes") : "None found"} />
                <Fact label="llms.txt" value={signals.hasLlmsTxt ? "Present" : "Absent"} />
                <Fact label="Canonical / hreflang" value={`${signals.hasCanonical ? "canonical" : "no canonical"} · ${signals.hasHreflang ? "hreflang" : "no hreflang"}`} />
              </dl>
            )}
            {agent && (
              <dl className="contents">
                <Fact label="Markdown for agents" value={agent.markdownNegotiation ? "Supported" : "Not offered"} />
                <Fact label="Content-Signal header" value={agent.contentSignal ? "Declared" : "Absent"} />
                <Fact label="MCP server card" value={agent.mcpServerCard ? "Present" : "Absent"} />
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      {/* Neighbors */}
      <Card>
        <CardHeader>
          <CardTitle>Explore nearby</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {neighbors.previous && (
              <a href={`/company/${encodeURIComponent(neighbors.previous.domain)}`} onClick={companyLink(neighbors.previous.domain)} className="rounded-lg border border-border bg-background px-3 py-2 hover:bg-accent focus-ring">
                ← #{neighbors.previous.rank} <span className="font-mono">{neighbors.previous.domain}</span>
              </a>
            )}
            {neighbors.next && (
              <a href={`/company/${encodeURIComponent(neighbors.next.domain)}`} onClick={companyLink(neighbors.next.domain)} className="rounded-lg border border-border bg-background px-3 py-2 hover:bg-accent focus-ring">
                #{neighbors.next.rank} <span className="font-mono">{neighbors.next.domain}</span> →
              </a>
            )}
          </div>
          {neighbors.sameGroup.length > 0 && (
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Also in {site.group}</span>
              <ul className="flex flex-wrap gap-1.5">
                {neighbors.sameGroup.map((n) => (
                  <li key={n.domain}>
                    <a href={`/company/${encodeURIComponent(n.domain)}`} onClick={companyLink(n.domain)} className="focus-ring rounded-full">
                      <Badge variant="outline" size="sm">
                        <span className="font-mono">{n.domain}</span>
                        {n.coverage !== null && <span className="text-muted-foreground">{n.coverage}%</span>}
                      </Badge>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-0.5">
            <span className="text-sm font-medium">How does your site compare?</span>
            <span className="text-xs text-muted-foreground">
              Run the same raw-HTML, robots.txt and structured-data checks on your own domain.
            </span>
          </div>
          <a
            href="/seo-check"
            onClick={(event) => {
              if (!onOpenSeoCheck) return;
              event.preventDefault();
              onOpenSeoCheck();
            }}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-ring"
          >
            Run the SEO check
          </a>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <SourceLine label="Tranco top-sites study" href="https://tranco-list.eu" note="Rank axis + crawl target list" />
          <SourceLine label="AI Crawler Census / robots.txt" note="Per-crawler verdicts from the crawl" />
          <SourceLine label="Cisco Umbrella Popularity List" href="http://s3-us-west-1.amazonaws.com/umbrella-static/index.html" note="Passive-DNS rank (no API key)" />
          {profile?.url && <SourceLine label="Wikipedia" href={profile.url} note="Company profile summary" />}
          {enr?.openPageRank && <SourceLine label="Open PageRank (DomCop)" href="https://www.domcop.com/openpagerank/" note="Domain authority score" />}
          {enr?.crux && <SourceLine label="CrUX (Chrome UX Report)" href="https://developer.chrome.com/docs/crux/" note="Field Core Web Vitals" />}
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-0.5 rounded-lg border border-border bg-background px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="numeric text-sm font-medium">{value}</dd>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SourceLine({ label, href, note }: { label: string; href?: string; note: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="text-xs text-primary">
          Open
        </a>
      )}
    </div>
  );
}