import { ArrowRight } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import type { ExplorerQuery, KeyFinding, KeyFindingGroup, KeyRelationship } from "@/content/key-findings";
import { cn } from "@/lib/cn";

/** Chart-token hue → literal class (Tailwind needs the full class name in source). */
const hueDot: Record<string, string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  "chart-6": "bg-chart-6",
};

const relationshipBadge: Record<KeyRelationship["kind"], { label: string; variant: "primary" | "info" | "neutral" }> = {
  strong: { label: "Strong link", variant: "primary" },
  context: { label: "Context", variant: "info" },
  none: { label: "No link found", variant: "neutral" },
};

function FindingCard({ finding, onExplore }: { finding: KeyFinding; onExplore?: (query: ExplorerQuery) => void }) {
  return (
    <Card className={cn(finding.headline && "border-primary/30")}>
      <CardContent className="grid h-full content-start gap-3">
        <div className="grid gap-1">
          <span className="text-sm text-muted-foreground">{finding.label}</span>
          <span className="numeric text-4xl font-extrabold leading-none tracking-tight">{finding.value}</span>
          <span className="text-sm leading-snug text-muted-foreground">{finding.sub}</span>
        </div>
        <p className="text-sm leading-relaxed">{finding.note}</p>
        {finding.explore && onExplore && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-auto w-fit -ml-2"
            onClick={() => onExplore(finding.explore!.query)}
          >
            {finding.explore.label}
            <ArrowRight />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export interface KeyFindingsProps {
  groups: KeyFindingGroup[];
  relationships: KeyRelationship[];
  /** Open the Linked Explorer with these filters applied. */
  onExplore?: (query: ExplorerQuery) => void;
  className?: string;
}

/**
 * The study's headline results as cards, grouped by pipeline stage, each able to open the
 * Explorer on the sites behind its number. Props in, markup out — the page supplies the data.
 */
export function KeyFindings({ groups, relationships, onExplore, className }: KeyFindingsProps) {
  return (
    <div data-slot="key-findings" className={cn("grid gap-10", className)}>
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`kf-${group.id}`} className="grid gap-4">
          <div className="flex items-baseline gap-3">
            <span aria-hidden className={cn("size-2.5 translate-y-px rounded-full", hueDot[group.hue])} />
            <h2 id={`kf-${group.id}`} className="text-lg font-semibold tracking-tight">
              {group.title}
            </h2>
            <span className="text-sm text-muted-foreground">{group.question}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onExplore={onExplore} />
            ))}
          </div>
        </section>
      ))}

      {relationships.length > 0 && (
        <section aria-labelledby="kf-connections" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="kf-connections" className="text-lg font-semibold tracking-tight">
              How the findings connect
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              The relationships the crawl actually measured, including where it found none.
            </p>
          </div>
          <Card>
            <CardContent className="grid divide-y divide-border">
              {relationships.map((relationship) => {
                const badge = relationshipBadge[relationship.kind];
                return (
                  <div key={relationship.id} className="grid gap-1.5 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{relationship.label}</span>
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{relationship.note}</p>
                    <span className="text-xs text-muted-foreground/80">
                      {relationship.between[0]} ↔ {relationship.between[1]}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
