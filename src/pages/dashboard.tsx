import { Seo } from "@/components/seo";
import type { PageSeo } from "@/content/types";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Braces,
  Code2,
  X,
  FileSearch,
  Gauge,
  Globe2,
  Grid3x3,
  Info,
  Menu,
  Lightbulb,
  ListChecks,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  ShieldAlert,
  SquaresIntersect,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AppNavItem,
  AppSidebar,
  AppTopbar,
  CompanyCard,
  CompanyDirectory,
  CrawlerPolicyLegend,
  CrawlerPolicyList,
  DataVisualizations,
  FactorScorecard,
  vizIntros,
  KeyFindings,
  LinkedExplorer,
  SiteDetail,
  StatCard,
} from "@/components/app";
import type { NavSection } from "@/components/app";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartFrame,
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  PageHeader,
  Separator,
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  rankMethodology,
  topSitesStudy,
} from "@/content/top-sites";
import { factorMeasurements } from "@/content/factors";
import { keyFindingGroups, keyRelationships } from "@/content/key-findings";
import type { ExplorerQuery } from "@/content/key-findings";
import { studyFacts } from "@/content/study-facts";
import { explorerFacets, numericMetrics } from "@/content/site-enrichment";
import type { StudySite } from "@/content/top-sites";
import { companyProfileByDomain } from "@/content/companies";
import { cn } from "@/lib/cn";

/* --------------------------------- Data ----------------------------------- */

const { counts, coverage, histogram } = topSitesStudy.summary;
const totalSites = topSitesStudy.sites.length;
const readableShare = ((100 * counts.measured) / totalSites).toFixed(1);
const unreachable = counts.raw_blocked + counts.both_blocked + counts.robots_excluded;
const unreachableShare = ((100 * unreachable) / totalSites).toFixed(1);

/** Short axis labels for the per-vertical chart. */
const groupShortNames: Record<string, string> = {
  "Search engines": "Search",
  "AI products": "AI",
  "News & media": "News",
  "E-commerce": "Commerce",
  "Cloud & dev": "Cloud",
  "Streaming & entertainment": "Streaming",
  "Reference & edu": "Reference",
  Social: "Social",
};

const groupsByCoverage = [...topSitesStudy.groups].sort(
  (a, b) => (b.medianCoverage ?? -1) - (a.medianCoverage ?? -1),
);



/* ------------------------------- Utilities -------------------------------- */


/**
 * The explorer plots the whole study: every crawled site, readable or not.
 * One entry, so the dataset switch stays hidden. Stable reference so memoized panels don't recompute.
 */
/** "Crawled ranks 1–500 twice, 501–2,132 once." — built from the crawl metadata, never typed. */
const explorerNote = Object.entries(topSitesStudy.meta.runsByRankRange ?? {})
  .map(([range, passes]) => {
    const [from, to] = range.split("-").map(Number);
    return `${from!.toLocaleString()}–${to!.toLocaleString()} ${passes === 1 ? "once" : passes === 2 ? "twice" : `${passes}×`}`;
  })
  .join(", ");

const explorerDatasets = [
  {
    id: "top-sites",
    label: "Top sites",
    sites: topSitesStudy.sites,
    groups: topSitesStudy.groups,
    note: explorerNote ? `Crawled ranks ${explorerNote}.` : undefined,
  },
];

const explorerCrawled = topSitesStudy.sites.length;
const explorerReadable = topSitesStudy.sites.filter((site) => site.classification === "measured").length;

function StudySection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-4">
      {title && (
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Page header copy for the sidebar views that don't come from `vizIntros`. */
const pageHeaders = {
  explorer: {
    title: "Linked Explorer",
    description: `${explorerCrawled.toLocaleString()} sites from Tranco list ${topSitesStudy.meta.tranco.listId}, ${explorerReadable.toLocaleString()} readable as plain HTML: raw HTML versus rendered JavaScript, and what each AI crawler is allowed to fetch.`,
  },
  findings: {
    title: "Key findings",
    description: "The study's headline results, each computed from the crawl. Open any of them in the Explorer to see the sites behind the number.",
  },
  practices: {
    title: "Best practices",
    description: "How many studied sites pass each measurable SEO and GEO ranking factor — with the sample size behind every rate, and whether the test is direct or a proxy.",
  },
  companies: {
    title: "Company Directory",
    description: "All study companies in card view. Click a card for a full SEO + GEO deep dive.",
  },
  info: {
    title: "Info",
    description: "Study details, methodology, and additional information.",
  },
};

const dashboardSeo: PageSeo = {
  title: `AI readability study: ${studyFacts.crawled.toLocaleString("en-US")} top sites | Seobot`,
  description:
    `Which of ${studyFacts.crawled.toLocaleString("en-US")} top sites can AI crawlers read? Plain HTML vs rendered JavaScript, robots.txt crawler policies, and a filterable per-site explorer.`,
  path: "/dashboard",
};

/* --------------------------------- Page ----------------------------------- */

export function DashboardPage({
  onHome,
  onOpenCompany,
  initialShowCompanies = false,
}: {
  onHome?: () => void;
  onOpenCompany?: (domain: string) => void;
  initialShowCompanies?: boolean;
}) {
  void onOpenCompany;
  void initialShowCompanies;
  const [showCompanies, setShowCompanies] = useState(initialShowCompanies);

  /**
   * Open the Linked Explorer pre-filtered. The Explorer reads its filters from the URL when it
   * mounts, so writing the query first and then switching views applies them (and clears any old ones).
   */
  const openExplorerWith = (query: ExplorerQuery) => {
    const search = new URLSearchParams(query).toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
    setShowCompanies(false);
    setActiveViz("explorer");
    window.scrollTo({ top: 0 });
  };
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeViz, setActiveViz] = useState<"explorer" | "practices" | "findings" | "crawler" | "coblocking" | "radar" | "jsonld" | "lollipop" | "signals" | "geo" | "semantics" | "info">("explorer");
  const [detailPanel, setDetailPanel] = useState<
    { kind: "list"; title: string; sites: any[] } | { kind: "site"; site: StudySite } | null
  >(null);
  const closeDetail = () => setDetailPanel(null);

  // Switching views always starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeViz, showCompanies]);
  const detailTitle = !detailPanel
    ? ""
    : detailPanel.kind === "site"
      ? detailPanel.site.domain
      : `${detailPanel.title} (${detailPanel.sites.length})`;
  const detailBody = !detailPanel ? null : detailPanel.kind === "site" ? (
    <div className="grid gap-5">
      <SiteDetail site={detailPanel.site} onOpenCompany={onOpenCompany} />
    </div>
  ) : (
    <div className="grid gap-3">
      {detailPanel.sites.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No companies match.</p>
      ) : (
        detailPanel.sites.map((site) => (
          <CompanyCard
            key={site.domain}
            site={site}
            profile={companyProfileByDomain.get(site.domain)}
            onClick={() => onOpenCompany?.(site.domain)}
          />
        ))
      )}
    </div>
  );
  const [isDesktop, setIsDesktop] = useState(false);
  /** The right sidebar's slot for the explorer's filter panels (the explorer portals into it). */
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const [filterHost, setFilterHost] = useState<HTMLDivElement | null>(null);
  const isExplorer = !showCompanies && activeViz === "explorer";
  const explorerSidebar = isDesktop && !showCompanies && activeViz === "explorer";

  const header = showCompanies
    ? pageHeaders.companies
    : activeViz === "explorer" || activeViz === "info" || activeViz === "practices" || activeViz === "findings"
      ? pageHeaders[activeViz]
      : vizIntros[activeViz];
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsDesktop(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const navSections: NavSection[] = [
    {
      label: "Data visualizations",
      items: [
        { label: "Linked Explorer", icon: <Network className="size-4" />, active: !showCompanies && activeViz === "explorer", onClick: () => { setShowCompanies(false); setActiveViz("explorer"); } },
        { label: "Best practices", icon: <ListChecks className="size-4" />, active: !showCompanies && activeViz === "practices", onClick: () => { setShowCompanies(false); setActiveViz("practices"); } },
        { label: "Key findings", icon: <Lightbulb className="size-4" />, active: !showCompanies && activeViz === "findings", onClick: () => { setShowCompanies(false); setActiveViz("findings"); } },
        { label: "Crawler × Vertical Block Rate", icon: <Grid3x3 className="size-4" />, active: !showCompanies && activeViz === "crawler", onClick: () => { setShowCompanies(false); setActiveViz("crawler"); } },
        { label: "Co-blocking Matrix", icon: <SquaresIntersect className="size-4" />, active: !showCompanies && activeViz === "coblocking", onClick: () => { setShowCompanies(false); setActiveViz("coblocking"); } },
        { label: "Anti-Bot Radar", icon: <Radar className="size-4" />, active: !showCompanies && activeViz === "radar", onClick: () => { setShowCompanies(false); setActiveViz("radar"); } },
        { label: "JSON-LD Flow", icon: <Braces className="size-4" />, active: !showCompanies && activeViz === "jsonld", onClick: () => { setShowCompanies(false); setActiveViz("jsonld"); } },
        { label: "Raw vs Rendered", icon: <BarChart3 className="size-4" />, active: !showCompanies && activeViz === "lollipop", onClick: () => { setShowCompanies(false); setActiveViz("lollipop"); } },
        { label: "Additional Signals", icon: <Grid3x3 className="size-4" />, active: !showCompanies && activeViz === "signals", onClick: () => { setShowCompanies(false); setActiveViz("signals"); } },
        { label: "GEO Readiness", icon: <Radar className="size-4" />, active: !showCompanies && activeViz === "geo", onClick: () => { setShowCompanies(false); setActiveViz("geo"); } },
        { label: "Semantics & IA", icon: <Code2 className="size-4" />, active: !showCompanies && activeViz === "semantics", onClick: () => { setShowCompanies(false); setActiveViz("semantics"); } },
        { label: "Company Directory", icon: <Building2 className="size-4" />, active: showCompanies, onClick: () => { setShowCompanies(true); } },
        { label: "Info", icon: <Info className="size-4" />, active: !showCompanies && activeViz === "info", onClick: () => { setShowCompanies(false); setActiveViz("info"); } },
      ],
    },
  ];

  const datasetFooter = sidebarCollapsed ? (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => onHome?.()}
      aria-label="Back to homepage"
    >
      <ArrowLeft />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="justify-start"
      onClick={() => onHome?.()}
    >
      <ArrowLeft />
      Back to homepage
    </Button>
  );

  return (
    <>
    <Seo {...dashboardSeo} />
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <AppSidebar
        className="sticky top-0 hidden h-dvh lg:flex"
        collapsed={sidebarCollapsed}
        header={
          <a
            href="/"
            onClick={(event) => {
              if (!onHome) return;
              event.preventDefault();
              onHome();
            }}
            aria-label="Seobot home"
            className="rounded-lg focus-ring"
          >
            {sidebarCollapsed ? <LogoMark size="sm" /> : <Logo size="sm" />}
          </a>
        }
        sections={navSections}
        footer={datasetFooter}
      />

      {/* Mobile navigation */}
      <Dialog
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        className="w-[calc(100%-2rem)] max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>Study navigation</DialogTitle>
          <DialogDescription>Jump to a section, or head back to the homepage.</DialogDescription>
        </DialogHeader>
        <nav className="grid gap-4">
          {navSections.map((section, index) => (
            <div key={section.label ?? index} className="grid gap-1">
              {section.label && (
                <div className="px-3 text-xs font-medium text-muted-foreground">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => (
                <AppNavItem
                  key={item.label}
                  item={item}
                  onSelect={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors [&_svg:not([class*='size-'])]:size-4.5",
                    item.active
                      ? "bg-primary-soft font-medium text-primary-soft-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border pt-4">{datasetFooter}</div>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar>
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring lg:grid"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>

          <a
            href="/"
            onClick={(event) => {
              if (!onHome) return;
              event.preventDefault();
              onHome();
            }}
            aria-label="Seobot home"
            className="rounded-lg focus-ring lg:hidden"
          >
            <Logo size="sm" />
          </a>

          {/* Portal host stays mounted (hidden off the explorer) so React never removes it in the same commit as the portal's children. */}
          <div ref={setToolbarHost} className={explorerSidebar ? "flex min-w-0 flex-1 items-center" : "hidden"} />
          {!explorerSidebar && <div className="hidden text-sm text-muted-foreground lg:block">SEO and GEO Data</div>}

          <div className={cn("flex shrink-0 items-center gap-1.5", !explorerSidebar && "ml-auto")}>
            <ThemeToggle />
            {explorerSidebar && (
              <Button
                variant="secondary"
                size="sm"
                aria-pressed={filtersOpen && !detailPanel}
                onClick={() => {
                  // With a site open, the button returns to the filters rather than hiding the sidebar.
                  if (detailPanel) {
                    closeDetail();
                    setFiltersOpen(true);
                  } else setFiltersOpen((open) => !open);
                }}
              >
                <SlidersHorizontal />
                Filters
              </Button>
            )}
          </div>
        </AppTopbar>

        <main className={isExplorer ? "flex flex-1 flex-col" : "flex flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8"}>
          {!isExplorer && <PageHeader title={header.title} description={header.description} />}

          {/* Signal map — the primary view */}


          {/* AI readability */}

          {/* Crawler policies */}

          {/* Sites */}

          {showCompanies && (
            <StudySection id="company-directory">
              <CompanyDirectory
                sites={topSitesStudy.sites}
                counts={topSitesStudy.summary.counts}
                profileFor={(domain) => companyProfileByDomain.get(domain)}
                onOpenCompany={onOpenCompany}
              />
            </StudySection>
          )}

          <div className={showCompanies ? "hidden" : ""}>
          <StudySection
            id="visualizations"
          >
            {activeViz === "info" ? (
              <Accordion className="grid gap-2">
                <AccordionItem value="crawlers" title={<span className="text-lg font-semibold">Crawler policies</span>}>
                  <StudySection id="crawlers" title="Crawler policies" description="robots.txt verdicts for all 17 crawler tokens.">
                    <Card>
                      <CardHeader>
                        <CardTitle>Who is allowed in</CardTitle>
                        <CardDescription>
                          Counts per token, worst verdict first.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-6">
                        <CrawlerPolicyLegend />
                        <Separator />
                        <CrawlerPolicyList />
                      </CardContent>
                    </Card>
                  </StudySection>
                </AccordionItem>
                <AccordionItem value="coverage" title={<span className="text-lg font-semibold">AI readability</span>}>
                  <StudySection id="coverage" title="AI readability" description="Coverage is the share of the browser-rendered page that a non-rendering client receives as raw HTML.">
                    <div className="grid gap-4 xl:grid-cols-3">
                      <Card className="xl:col-span-2">
                        <CardContent>
                          <ChartFrame title="Coverage distribution" caption={`Median ${coverage.median}% across ${coverage.measured} readable homepages.`} ariaLabel="Histogram">
                            <ResponsiveContainer width="100%" height={220}>
                              <RechartsBarChart data={histogram.bins.map((count, index) => ({ bin: `${index * histogram.binSize}–${index === histogram.bins.length - 1 ? 100 : index * histogram.binSize + 9}%`, sites: count }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                                <XAxis dataKey="bin" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
                                <YAxis tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(value: any) => [`${value} sites`, "Sites"]} />
                                <Bar dataKey="sites" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </ChartFrame>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent>
                          <ChartFrame title="Median coverage by vertical" caption="Reference and education sites keep the most content in raw HTML." ariaLabel="Bar chart">
                            <ResponsiveContainer width="100%" height={220}>
                              <RechartsBarChart data={groupsByCoverage.map((group) => ({ name: groupShortNames[group.name] ?? group.name, coverage: group.medianCoverage ?? 0 }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                                <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
                                <YAxis tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(value: any) => [`${value}%`, "Median coverage"]} />
                                <Bar dataKey="coverage" fill="#f97316" radius={[4, 4, 0, 0]} />
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </ChartFrame>
                        </CardContent>
                      </Card>
                    </div>
                  </StudySection>
                </AccordionItem>
                <AccordionItem value="ranking" title={<span className="text-lg font-semibold">Why these are the top sites</span>}>
                  <StudySection id="ranking" title="Why these are the top sites" description="Every domain here earned its place the same way.">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>What a rank can — and can't — tell you</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <p className="text-sm leading-relaxed text-muted-foreground">{rankMethodology.meaning}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </StudySection>
                </AccordionItem>
                <AccordionItem value="methodology" title={<span className="text-lg font-semibold">Methodology</span>}>
                  <StudySection id="methodology" title="Methodology" description={topSitesStudy.meta.method}>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard label="Sites in the study" value={totalSites} valueSuffix=" top sites" icon={<Globe2 />} />
                      <StatCard label="Readable as plain HTML" value={counts.measured} valueSuffix={` / ${totalSites}`} icon={<FileSearch />} delta={`${readableShare}%`} deltaTone="positive" deltaLabel="of the list" />
                      <StatCard label="Median AI-visible content" value={`${coverage.median}%`} icon={<Gauge />} sparkData={histogram.bins} />
                      <StatCard label="Unreadable to non-JS crawlers" value={unreachable} valueSuffix=" sites" icon={<ShieldAlert />} delta={`${unreachableShare}%`} deltaTone="negative" deltaLabel="walled or robots-excluded" />
                    </div>
                  </StudySection>
                </AccordionItem>
              </Accordion>
            ) : activeViz === "explorer" ? (
              <LinkedExplorer
                datasets={explorerDatasets}
                facets={explorerFacets}
                metrics={numericMetrics}
                onOpenCompany={onOpenCompany}
                selected={detailPanel?.kind === "site" ? detailPanel.site : null}
                onSelect={(site) => setDetailPanel(site ? { kind: "site", site } : null)}
                asideTarget={explorerSidebar ? filterHost : null}
                toolbarTarget={explorerSidebar ? toolbarHost : null}
                heading={<PageHeader title={header.title} description={header.description} />}
                footnote={
                  <>
                    Built from the study in <span className="font-mono">tools/crawl/</span> — same user agent in both
                    passes, robots.txt honoured, ≤4 sites in flight. Derived metrics are published under{" "}
                    {topSitesStudy.meta.license}; inclusion in the list is not an endorsement. Dataset generated{" "}
                    {new Date(topSitesStudy.meta.generatedAt).toISOString().slice(0, 10)}.
                  </>
                }
              />
            ) : activeViz === "findings" ? (
              <KeyFindings groups={keyFindingGroups} relationships={keyRelationships} onExplore={openExplorerWith} />
            ) : activeViz === "practices" ? (
              <FactorScorecard data={factorMeasurements} />
            ) : (
              <DataVisualizations activeViz={(String(activeViz) === "info" ? undefined : activeViz) as any} onOpenDetail={(d) => setDetailPanel({ kind: "list", ...d })} />
            )}
          </StudySection>
          </div>


          {!isExplorer && (
          <footer className="border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
            Built from the study in <span className="font-mono">tools/crawl/</span> — same user
            agent in both passes, robots.txt honoured, ≤4 sites in flight. Derived metrics are
            published under {topSitesStudy.meta.license}; inclusion in the list is not an
            endorsement. Dataset generated {new Date(topSitesStudy.meta.generatedAt).toISOString().slice(0, 10)}.
          </footer>
          )}
        </main>
      </div>

      <aside className={cn((detailPanel || explorerSidebar) && (detailPanel || filtersOpen) ? "hidden lg:flex" : "hidden", "w-96 shrink-0 flex-col border-l border-border bg-surface sticky top-0 h-dvh min-h-0")}>
          {detailPanel && (
            <>
              <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
                <h3 className="truncate text-sm font-semibold">{detailTitle}</h3>
                <Button variant="ghost" size="icon-sm" onClick={closeDetail} aria-label={explorerSidebar ? "Close and return to filters" : "Close panel"}>
                  <X />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{detailBody}</div>
            </>
          )}
          {/* Stays mounted while a site is open so filters keep their place. */}
          <div ref={setFilterHost} className={cn("min-h-0 flex-1 flex-col", detailPanel || !explorerSidebar ? "hidden" : "flex")} />
        </aside>

      {detailPanel && !isDesktop && (
        <Sheet open onOpenChange={(open) => { if (!open) closeDetail(); }}>
          <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
            <SheetTitle className="shrink-0 border-b border-border px-4 py-4 pr-12 text-sm">{detailTitle}</SheetTitle>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{detailBody}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
    </>
  );
}
