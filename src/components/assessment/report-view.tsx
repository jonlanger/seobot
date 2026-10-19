import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ExternalLink, Printer, RotateCcw, Search, X } from "lucide-react";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  ChartFrame,
  EmptyState,
  Input,
  MeterList,
  ProgressRing,
  SegmentBar,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import type { SegmentBarItem } from "@/components/ui";
import {
  confidenceCopy,
  parseSiteUrl,
  priorityBands,
  questionsForSiteType,
  resolveQuestionLink,
  siteTypes,
  verdictFor,
} from "@/content/seo-check";
import type { AssessmentLink, ResolvedLink } from "@/content/seo-check";
import { CATEGORY_IDS, CATEGORY_LABELS, scoreBand } from "@/lib/audit";
import type { AssessmentResult, CategoryId, SiteType } from "@/lib/audit";
import { cn } from "@/lib/cn";
import { ActionCard } from "./action-card";

const quickChecks: AssessmentLink[] = [
  { kind: "search", label: "See what Google has indexed" },
  { kind: "pageSpeed", label: "Run the mobile speed test" },
  { kind: "site", label: "Read robots.txt", path: "/robots.txt" },
];

const ringStroke = {
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-destructive",
} as const;

const ringText = {
  success: "text-success-soft-foreground",
  warning: "text-warning-soft-foreground",
  danger: "text-destructive-soft-foreground",
} as const;

export interface ReportViewProps {
  result: AssessmentResult;
  siteType: SiteType;
  /** Visitor's URL — personalizes copy and builds deep links only. Never fetched. */
  siteUrl: string;
  onRestart: () => void;
}

/** One consistent, obvious section shell: eyebrow → title → description → content. */
function ReportSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-6">
      <header className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-soft-foreground">
          {eyebrow}
        </span>
        <h2 id={id} className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

/** The visualized report: score hero → results → checks → filterable roadmap. */
export function ReportView({ result, siteType, siteUrl, onRestart }: ReportViewProps) {
  const questions = questionsForSiteType(siteType);
  const byId = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);

  const site = parseSiteUrl(siteUrl);
  const typeLabel = siteTypes.find((type) => type.id === siteType)?.label ?? "Your site";
  const band = scoreBand(result.score);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "fix" | "verify">("all");
  const [category, setCategory] = useState<"all" | CategoryId>("all");

  const categoriesWithFindings = useMemo(
    () => CATEGORY_IDS.filter((id) => result.findings.some((finding) => finding.category === id)),
    [result.findings],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return result.findings.filter((finding) => {
      if (kind !== "all" && finding.kind !== kind) return false;
      if (category !== "all" && finding.category !== category) return false;
      if (!needle) return true;
      const question = byId.get(finding.questionId);
      if (!question) return false;
      const haystack = [question.action, question.prompt, question.why, ...question.fix, ...question.verify]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [result.findings, query, kind, category, byId]);

  const filtersActive = query.trim() !== "" || kind !== "all" || category !== "all";
  const clearFilters = () => {
    setQuery("");
    setKind("all");
    setCategory("all");
  };

  const fixCount = result.findings.filter((finding) => finding.kind === "fix").length;
  const verifyCount = result.findings.length - fixCount;

  const quickLinks: ResolvedLink[] = site
    ? quickChecks
        .map((link) => resolveQuestionLink(link, siteUrl))
        .filter((link): link is ResolvedLink => link !== null)
    : [];

  const bands = priorityBands
    .map((priorityBand) => ({
      ...priorityBand,
      findings: filtered.filter((finding) => finding.band === priorityBand.id),
    }))
    .filter((priorityBand) => priorityBand.findings.length > 0);

  const biggestGap = result.findings.find((finding) => finding.kind === "fix");
  const gapQuestion = biggestGap ? byId.get(biggestGap.questionId) : undefined;

  const answeredSegments: SegmentBarItem[] = [
    { id: "yes", label: "Yes", value: result.breakdown.yes, tone: "success" },
    { id: "unsure", label: "Not sure", value: result.breakdown.unsure, tone: "warning" },
    { id: "no", label: "No", value: result.breakdown.no, tone: "danger" },
  ];

  return (
    <div data-slot="report-view" className="mx-auto grid w-full max-w-5xl gap-14 sm:gap-20">
      {/* Score hero */}
      <section aria-labelledby="report-score-heading" className="grid gap-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-8 p-6 sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
              <ProgressRing
                value={result.score}
                size={200}
                strokeWidth={14}
                indicatorClassName={ringStroke[band]}
                aria-label={`SEO score: ${result.score} out of 100`}
                className="mx-auto"
              >
                <div className="grid place-items-center text-center">
                  <span
                    className={cn(
                      "numeric font-mono text-6xl font-semibold tracking-tight",
                      ringText[band],
                    )}
                  >
                    {result.score}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">out of 100</span>
                </div>
              </ProgressRing>

              <div className="grid justify-items-center gap-4 text-center lg:justify-items-start lg:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <Badge variant="primary" size="sm">
                    Your SEO Check
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {site ? `${typeLabel} · ${site.host}` : typeLabel}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {fixCount} to fix · {verifyCount} to verify
                  </Badge>
                </div>
                <h2
                  id="report-score-heading"
                  className="text-balance text-display-sm font-semibold tracking-tight"
                >
                  {verdictFor(result.score)}
                </h2>
                <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
                  {confidenceCopy[result.confidence]} {result.answered} of {result.total} questions
                  answered.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {gapQuestion && (
          <Card className="gap-3 border-primary-soft bg-primary-soft/40 py-5">
            <CardContent className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-soft-foreground">
                Your biggest gap
              </span>
              <h3 className="text-lg font-semibold tracking-tight">{gapQuestion.action}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{gapQuestion.why}</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Results */}
      <ReportSection
        id="report-results-heading"
        eyebrow="Results"
        title="Where your score comes from"
        description="The shape of your answers and the severity-weighted scores behind the number — all derived from what you told us."
      >
        <div className="grid gap-6">
          <Card>
            <CardContent className="py-6">
              <ChartFrame
                title="How you answered"
                caption={`${result.answered} of ${result.total} answered · ${result.breakdown.unsure} marked “not sure”.`}
                table={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Answer</TableHead>
                        <TableHead className="text-right">Questions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answeredSegments.map((segment) => (
                        <TableRow key={segment.id}>
                          <TableCell className="font-medium">{segment.label}</TableCell>
                          <TableCell className="numeric text-right font-mono">
                            {segment.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
              >
                <SegmentBar items={answeredSegments} />
              </ChartFrame>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <ChartFrame
                title="Score by area"
                caption="Severity-weighted, 0–100 — weights tuned to your site type."
                table={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.categories.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.label}</TableCell>
                          <TableCell className="numeric text-right font-mono">{item.score}</TableCell>
                          <TableCell className="numeric text-right font-mono">{item.weight}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
              >
                <MeterList
                  items={result.categories.map((item) => ({
                    id: item.id,
                    label: item.label,
                    value: item.score,
                    tone: scoreBand(item.score),
                  }))}
                />
              </ChartFrame>
            </CardContent>
          </Card>
        </div>
      </ReportSection>

      {/* One-click verification links */}
      {quickLinks.length > 0 && site && (
        <ReportSection
          id="report-checks-heading"
          eyebrow="Verify"
          title="Run these checks now"
          description={`One click each — Google's tools open in a new tab, prefilled with ${site.host}. Your URL is never sent from this page.`}
        >
          <Card>
            <CardContent className="flex flex-wrap gap-2 py-6">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  {link.label}
                  <ExternalLink className="size-3.5" />
                </a>
              ))}
            </CardContent>
          </Card>
        </ReportSection>
      )}

      {/* Roadmap */}
      <ReportSection
        id="report-roadmap-heading"
        eyebrow="Priorities"
        title="Your roadmap"
        description={
          result.findings.length > 0
            ? "Ordered by impact against effort. Narrow it with search and filters, then work top to bottom."
            : undefined
        }
      >
        {result.findings.length === 0 ? (
          <Card>
            <CardContent className="grid gap-2 py-12 text-center">
              <p className="text-lg font-semibold tracking-tight">No findings. Genuinely.</p>
              <p className="text-sm text-muted-foreground">
                Every answer was a firm yes — rare air. Re-run the check after your next launch or
                redesign.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8">
            <div className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xs sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="lg:flex-1">
                  <Input
                    leading={<Search />}
                    placeholder="Search your roadmap…"
                    aria-label="Search roadmap items"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Tabs value={kind} onValueChange={(next) => setKind(next as "all" | "fix" | "verify")}>
                    <TabsList aria-label="Filter by task type">
                      <TabsTrigger value="all">All · {result.findings.length}</TabsTrigger>
                      <TabsTrigger value="fix">Fix · {fixCount}</TabsTrigger>
                      <TabsTrigger value="verify">Verify · {verifyCount}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="w-full sm:w-52">
                    <Select
                      aria-label="Filter by area"
                      value={category}
                      onChange={(event) => setCategory(event.target.value as "all" | CategoryId)}
                    >
                      <option value="all">All areas</option>
                      {categoriesWithFindings.map((id) => (
                        <option key={id} value={id}>
                          {CATEGORY_LABELS[id]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="numeric font-mono">
                  Showing {filtered.length} of {result.findings.length}
                </span>
                {filtersActive && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="size-3.5" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {bands.length > 0 ? (
              <div className="grid gap-12">
                {bands.map((priorityBand) => (
                  <section
                    key={priorityBand.id}
                    aria-labelledby={`band-${priorityBand.id}-title`}
                    className="grid gap-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="grid gap-1">
                        <h3
                          id={`band-${priorityBand.id}-title`}
                          className="text-xl font-semibold tracking-tight"
                        >
                          {priorityBand.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">{priorityBand.description}</p>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {priorityBand.findings.length}{" "}
                        {priorityBand.findings.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {priorityBand.findings.map((finding) => {
                        const question = byId.get(finding.questionId);
                        if (!question) return null;
                        return (
                          <ActionCard
                            key={finding.questionId}
                            question={question}
                            finding={finding}
                            siteUrl={siteUrl}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Search />}
                title="No items match these filters"
                description="Try a broader search, or clear the filters to see everything."
                action={
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            )}
          </div>
        )}
      </ReportSection>

      {/* Utilities */}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print report
        </Button>
        <Button variant="ghost" size="sm" onClick={onRestart}>
          <RotateCcw className="size-4" />
          Start over
        </Button>
      </div>
    </div>
  );
}
