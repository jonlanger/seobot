import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { EmptyState, Input, Pagination, SelectMenu } from "@/components/ui";
import { classificationMeta } from "@/content/top-sites";
import type { SiteClassification, StudySite } from "@/content/top-sites";
import { cn } from "@/lib/cn";
import { CompanyCard } from "./company-card";

type Profile = ComponentProps<typeof CompanyCard>["profile"];

export interface CompanyDirectoryProps {
  sites: StudySite[];
  /** Site count per classification, for the filter menu. */
  counts: Partial<Record<SiteClassification, number>>;
  profileFor: (domain: string) => Profile;
  onOpenCompany?: (domain: string) => void;
  /** Cards per page. */
  pageSize?: number;
  className?: string;
}

/**
 * Searchable, filterable, paginated card grid of every site in the study — readable or not.
 * Pagination keeps the DOM small (a full directory is thousands of cards); sorted by rank.
 */
export function CompanyDirectory({
  sites,
  counts,
  profileFor,
  onOpenCompany,
  pageSize = 36,
  className,
}: CompanyDirectoryProps) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<"all" | SiteClassification>("all");
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => [...sites].sort((a, b) => a.rank - b.rank), [sites]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ranked.filter((site) => {
      if (classification !== "all" && site.classification !== classification) return false;
      return !needle || site.domain.includes(needle);
    });
  }, [ranked, query, classification]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const options = [
    { value: "all", label: `All outcomes (${sites.length.toLocaleString("en-US")})` },
    ...(Object.keys(classificationMeta) as SiteClassification[])
      .filter((key) => (counts[key] ?? 0) > 0)
      .map((key) => ({ value: key, label: `${classificationMeta[key].label} (${counts[key]!.toLocaleString("en-US")})` })),
  ];

  const goTo = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div data-slot="company-directory" className={cn("grid gap-5", className)}>
      <div ref={top} className="flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Find a domain…"
            aria-label="Find a domain"
            leading={<Search className="size-4" />}
          />
        </div>
        <div className="w-full sm:w-64">
          <SelectMenu
            aria-label="Filter by outcome"
            value={classification}
            onValueChange={(value) => {
              setClassification(value as "all" | SiteClassification);
              setPage(1);
            }}
            options={options}
          />
        </div>
        <span aria-live="polite" className="numeric text-xs text-muted-foreground sm:ml-auto">
          {filtered.length.toLocaleString("en-US")} of {sites.length.toLocaleString("en-US")} sites
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No sites match" description="Try a different domain or outcome." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((site) => (
            <CompanyCard
              key={site.domain}
              site={site}
              profile={profileFor(site.domain)}
              onClick={() => onOpenCompany?.(site.domain)}
            />
          ))}
        </div>
      )}

      <Pagination
        page={current}
        pageCount={pageCount}
        onPageChange={goTo}
        summary={
          filtered.length === 0
            ? "No sites"
            : `Showing ${(start + 1).toLocaleString("en-US")}–${Math.min(start + pageSize, filtered.length).toLocaleString("en-US")} of ${filtered.length.toLocaleString("en-US")}`
        }
      />
    </div>
  );
}
