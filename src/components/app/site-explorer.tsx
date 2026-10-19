import { ChevronLeft, ChevronRight, ExternalLink, FileSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  Badge,
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Progress,
  ProgressRing,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  buttonVariants,
} from "@/components/ui";
import {
  classificationMeta,
  crawlerGroups,
  robotsStatusLabel,
  topSitesStudy,
  verdictBadgeVariant,
  verdictMeta,
} from "@/content/top-sites";
import type { RobotsVerdict, SiteClassification, StudySite } from "@/content/top-sites";

const PAGE_SIZE = 25;

type SortKey = "rank" | "domain" | "coverage-desc" | "coverage-asc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "rank", label: "Sort: Tranco rank" },
  { value: "coverage-desc", label: "Sort: coverage, high → low" },
  { value: "coverage-asc", label: "Sort: coverage, low → high" },
  { value: "domain", label: "Sort: domain A–Z" },
];

function coverageTone(coverage: number) {
  if (coverage >= 70) return "bg-success";
  if (coverage >= 40) return "bg-warning";
  return "bg-destructive";
}

function CoverageCell({ site }: { site: StudySite }) {
  if (site.coverage === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex items-center gap-2.5">
      <Progress
        value={site.coverage}
        className="h-1.5 w-20"
        indicatorClassName={coverageTone(site.coverage)}
        aria-label={`Coverage ${site.coverage}%`}
      />
      <span className="numeric font-mono text-xs">{site.coverage}%</span>
    </span>
  );
}

function CrawlerBadge({ token, verdict }: { token: string; verdict: RobotsVerdict }) {
  return (
    <Badge
      variant={verdictBadgeVariant[verdict]}
      size="sm"
      title={verdictMeta[verdict].description}
    >
      <span className="font-mono">{token}</span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      {verdictMeta[verdict].label}
    </Badge>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-0.5 rounded-lg border border-border bg-background px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="numeric text-sm font-medium">{value}</dd>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SiteDetail({ site, onOpenCompany }: { site: StudySite; onOpenCompany?: (domain: string) => void }) {
  const meta = classificationMeta[site.classification];
  const metrics = site.metrics;
  const flags = [
    metrics?.challengeLike ? "Interstitial-like browser pass" : null,
    metrics?.cjk ? "CJK bigrams" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{site.domain}</span>
          <Badge variant={meta.tone} size="sm" dot>
            {meta.label}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Tranco rank #{site.rank} — {meta.description}
        </DialogDescription>
      </DialogHeader>

      {site.coverage !== null ? (
        <div className="flex items-center gap-5 rounded-xl border border-border bg-background p-4">
          <ProgressRing value={site.coverage} size={88} strokeWidth={8}>
            <span className="numeric font-mono text-lg font-medium">{site.coverage}%</span>
          </ProgressRing>
          <div className="grid gap-1">
            <span className="text-sm font-medium">AI-visible content</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Share of the browser-rendered page present in the raw HTML that a non-rendering
              crawler receives.
            </span>
            {metrics && (
              <span className="numeric font-mono text-xs text-muted-foreground">
                {metrics.rawWords} raw tokens · {metrics.renderedWords} rendered tokens
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
          No coverage score is meaningful here — {meta.description.toLowerCase()}
        </div>
      )}

      <DialogFooter className="sm:flex-col-reverse">
        {onOpenCompany && (
          <Button variant="primary" size="sm" className="w-full" onClick={() => onOpenCompany(site.domain)}>
            Deep dive
          </Button>
        )}
        <a
          href={`https://${site.domain}/`}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}
        >
          <ExternalLink />
          Open {site.domain}
        </a>
      </DialogFooter>

      <div className="grid gap-2">
        <h3 className="text-sm font-medium">robots.txt</h3>
        <p className="text-xs text-muted-foreground">
          {robotsStatusLabel(site.robots.status)} · wildcard group:{" "}
          {verdictMeta[site.robots.wildcard].label.toLowerCase()}
        </p>
        <div className="grid gap-3">
          {crawlerGroups.map((group) => (
            <div key={group.id} className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
              <ul className="flex flex-wrap gap-1.5">
                {group.tokens.map((token) => (
                  <li key={token}>
                    <CrawlerBadge token={token} verdict={site.robots.verdicts[token] ?? "unset"} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {metrics && (
        <dl className="grid grid-cols-2 gap-2.5">
          <Fact
            label="Headings in raw HTML"
            value={metrics.headingsCoverage !== null ? `${metrics.headingsCoverage}%` : "—"}
            hint="of rendered h1–h3 text"
          />
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
            hint={metrics.titleDiffers ? "a non-rendering crawler sees a different title" : undefined}
          />
          <Fact
            label="Flags"
            value={flags.length > 0 ? flags.join(" · ") : "None"}
            hint={metrics.rawWords === 0 ? "Zero readable tokens in raw HTML" : undefined}
          />
        </dl>
      )}

      {site.note && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {site.note}
        </p>
      )}
    </>
  );
}

/**
 * All study sites — search, filter by classification, sort, page through,
 * and open any row for the full per-crawler robots verdict and content metrics.
 * Pure client-side over the committed study dataset.
 */
export function SiteExplorer() {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<"all" | SiteClassification>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StudySite | null>(null);

  const classificationCounts = topSitesStudy.summary.counts;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = topSitesStudy.sites.filter((site) => {
      if (classification !== "all" && site.classification !== classification) return false;
      if (needle && !site.domain.includes(needle)) return false;
      return true;
    });
    const sorted = [...rows];
    switch (sort) {
      case "rank":
        sorted.sort((a, b) => a.rank - b.rank);
        break;
      case "domain":
        sorted.sort((a, b) => a.domain.localeCompare(b.domain));
        break;
      case "coverage-desc":
        sorted.sort((a, b) => (b.coverage ?? -1) - (a.coverage ?? -1) || a.rank - b.rank);
        break;
      case "coverage-asc":
        sorted.sort((a, b) => (a.coverage ?? 101) - (b.coverage ?? 101) || a.rank - b.rank);
        break;
    }
    return sorted;
  }, [query, classification, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Controls */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Filter by domain…"
            aria-label="Filter by domain"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
          <Select
            value={classification}
            onChange={(event) => {
              setClassification(event.target.value as "all" | SiteClassification);
              setPage(1);
            }}
            aria-label="Filter by classification"
            className="lg:w-52"
          >
            <option value="all">All classifications ({topSitesStudy.sites.length})</option>
            {(Object.keys(classificationMeta) as SiteClassification[])
              .filter((key) => (classificationCounts[key] ?? 0) > 0)
              .map((key) => (
                <option key={key} value={key}>
                  {classificationMeta[key].label} ({classificationCounts[key]})
                </option>
              ))}
          </Select>
          <Select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
            }}
            aria-label="Sort sites"
            className="lg:w-60"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<FileSearch />}
            title="No sites match"
            description={`Nothing matches “${query.trim()}” in this classification. Try a shorter domain or reset the filters.`}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setClassification("all");
                }}
              >
                Reset filters
              </Button>
            }
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20 pl-5">Rank</TableHead>
              <TableHead>Site</TableHead>
              <TableHead className="min-w-40">AI-visible</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>GPTBot</TableHead>
              <TableHead className="w-14 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((site) => {
              const meta = classificationMeta[site.classification];
              const gptBot = site.robots.verdicts.GPTBot ?? "unset";
              return (
                <TableRow
                  key={site.domain}
                  className="cursor-pointer"
                  onClick={() => setSelected(site)}
                >
                  <TableCell className="numeric pl-5 font-mono text-xs text-muted-foreground">
                    #{site.rank}
                  </TableCell>
                  <TableCell className="font-medium">{site.domain}</TableCell>
                  <TableCell>
                    <CoverageCell site={site} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={meta.tone} size="sm">
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={verdictBadgeVariant[gptBot]} size="sm">
                      {verdictMeta[gptBot].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`View details for ${site.domain}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(site);
                      }}
                    >
                      <ChevronRight />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3.5 sm:px-5">
        <span className="numeric text-xs text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
          {filtered.length} sites
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="numeric px-2 font-mono text-xs">
            Page {safePage} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)} className="max-w-2xl">
        {selected && <SiteDetail site={selected} />}
      </Dialog>
    </div>
  );
}
