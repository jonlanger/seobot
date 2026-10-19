import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Beaker, Gauge, Info, ListChecks, Ruler } from "lucide-react";
import { Badge, Button, Card, CardContent, PassRateBar, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { layerLabel, layerMeta, layerOrder } from "@/content/factors";
import type { Factor, FactorLayer, FactorMeasurement, FactorMeasurements } from "@/content/factors";
import { cn } from "@/lib/cn";
import { StatCard } from "./stat-card";

type LayerFilter = "all" | FactorLayer;
type SortMode = "layer" | "gap";

/** The weakest pass rate among a factor's measurements — what "gap" sort ranks by. */
const weakest = (factor: Factor) => Math.min(...factor.measurements.map((m) => m.passPct));

/* ------------------------------ Measurement ------------------------------- */

function MeasurementBlock({ measurement }: { measurement: FactorMeasurement }) {
  const direct = measurement.kind === "direct";
  const bands = measurement.byRankBand ?? [];
  const cdns = measurement.byCdn ?? [];
  return (
    <div className="grid gap-2.5 rounded-lg border border-border bg-background p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="max-w-xl text-sm leading-snug">{measurement.label}</span>
        <Badge variant={direct ? "success" : "warning"} size="sm" dot>
          {direct ? "Direct test" : "Proxy"}
        </Badge>
      </div>

      <PassRateBar pct={measurement.passPct} n={measurement.n} label={measurement.label} />

      {/* A proxy's gap is part of the finding: it is always visible, not tucked in a disclosure. */}
      {(measurement.caveat || !direct) && (
        <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{measurement.caveat ?? "A stand-in for the factor, not the factor itself."}</span>
        </p>
      )}

      <details className="group">
        <summary className="w-fit cursor-pointer select-none rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring">
          How it was measured
        </summary>
        <div className="mt-3 grid gap-4">
          <dl className="grid gap-1.5 text-xs leading-relaxed">
            {[
              ["Test", measurement.predicate],
              ["Counted over", measurement.denominator],
              ["Source", measurement.dataset],
            ].map(([term, detail]) => (
              <div key={term} className="grid gap-0.5 sm:grid-cols-[6rem_1fr] sm:gap-3">
                <dt className="text-muted-foreground">{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
          {(bands.length > 0 || cdns.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {bands.length > 0 && (
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium">By Tranco rank</span>
                  {bands.map((band) => (
                    <div key={band.band} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                      <span className="numeric font-mono text-[0.6875rem] text-muted-foreground">{band.band}</span>
                      <PassRateBar size="sm" pct={band.passPct} n={band.n} label={`Rank ${band.band}`} />
                    </div>
                  ))}
                </div>
              )}
              {cdns.length > 0 && (
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium">By CDN</span>
                  {cdns.map((cdn) => (
                    <div key={cdn.cdn} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                      <span className="truncate text-[0.6875rem] text-muted-foreground">{cdn.cdn}</span>
                      <PassRateBar size="sm" pct={cdn.passPct} n={cdn.n} label={cdn.cdn} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

/* --------------------------------- Factor --------------------------------- */

function FactorCard({ factor }: { factor: Factor }) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" size="sm">
              {layerLabel(factor.layer)}
            </Badge>
            {factor.gate && (
              <Badge variant="primary" size="sm" title="Failing this can block visibility outright">
                Gate
              </Badge>
            )}
            {factor.surface.map((surface) => (
              <Badge key={surface} variant="neutral" size="sm">
                {surface.toUpperCase()}
              </Badge>
            ))}
            <span className="ml-auto text-[0.6875rem] text-muted-foreground">
              {factor.confidence} confidence · effort {factor.effort}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-snug tracking-tight">{factor.label}</h3>
        </div>
        <div className="grid gap-2.5">
          {factor.measurements.map((measurement) => (
            <MeasurementBlock key={measurement.id} measurement={measurement} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- Scorecard -------------------------------- */

export interface FactorScorecardProps {
  data: FactorMeasurements;
  className?: string;
}

/**
 * Best-practice scorecard: each measurable ranking factor with how many studied sites
 * pass, whether the test is direct or a proxy, and the sample size behind every rate.
 * Binds data via props.
 */
export function FactorScorecard({ data, className }: FactorScorecardProps) {
  const [layer, setLayer] = useState<LayerFilter>("all");
  const [sort, setSort] = useState<SortMode>("layer");

  const shown = useMemo(() => {
    const list = data.factors.filter((factor) => layer === "all" || factor.layer === layer);
    return [...list].sort((a, b) =>
      sort === "gap"
        ? weakest(a) - weakest(b)
        : layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer),
    );
  }, [data.factors, layer, sort]);

  const measurements = data.factors.flatMap((factor) => factor.measurements);
  const directCount = measurements.filter((m) => m.kind === "direct").length;
  const layersWithFactors = layerOrder.filter((id) => data.factors.some((factor) => factor.layer === id));

  return (
    <div data-slot="factor-scorecard" className={cn("grid gap-6", className)}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Factors measured"
          icon={<ListChecks />}
          value={data.meta.factorsMapped}
          valueSuffix={` / ${data.meta.factorsTotal}`}
        />
        <StatCard
          label="Readable sites"
          icon={<Gauge />}
          value={data.meta.sitesMeasured.toLocaleString()}
          valueSuffix={` of ${data.meta.sitesCrawled.toLocaleString()} crawled`}
        />
        <StatCard label="Direct tests" icon={<Ruler />} value={directCount} valueSuffix={` of ${measurements.length}`} />
        <StatCard label="Proxy measurements" icon={<Beaker />} value={measurements.length - directCount} valueSuffix=" stand-ins" />
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Each bar is the share of studied sites that pass one check. The sample size (n) differs per check, because
        a site only counts where the underlying field was measured. A <strong className="font-medium text-foreground">proxy</strong>{" "}
        is a weaker stand-in for the factor, with its gap stated. {data.meta.method}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={layer} onValueChange={(value) => setLayer(value as LayerFilter)}>
          <TabsList aria-label="Filter by layer">
            <TabsTrigger value="all">All</TabsTrigger>
            {layersWithFactors.map((id) => (
              <TabsTrigger key={id} value={id}>
                {layerMeta[id].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant={sort === "gap" ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={sort === "gap"}
          onClick={() => setSort(sort === "gap" ? "layer" : "gap")}
        >
          <ArrowDownWideNarrow className="size-4" />
          Biggest gaps first
        </Button>
      </div>

      {layer !== "all" && <p className="-mt-3 text-sm text-muted-foreground">{layerMeta[layer].blurb}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        {shown.map((factor) => (
          <FactorCard key={factor.factorId} factor={factor} />
        ))}
      </div>

      {data.candidateFactors.length > 0 && (
        <section className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-tight">Signals the factor list doesn't cover yet</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              We measure these on every site, but no ranking factor maps to them. Candidates for the next revision.
            </p>
          </div>
          <Card>
            <CardContent className="grid gap-3.5">
              {data.candidateFactors.map((candidate) => (
                <div key={candidate.id} className="grid gap-1.5 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-center sm:gap-4">
                  <span className="text-sm">{candidate.label}</span>
                  <PassRateBar pct={candidate.passPct} n={candidate.n} label={candidate.label} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {data.notMeasurable.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer select-none rounded-md text-sm font-medium focus-ring">
            {data.notMeasurable.length} factors this study can't measure
          </summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.notMeasurable.map((factor) => (
              <li key={factor.factorId} className="grid gap-0.5 text-sm">
                <span>{factor.label}</span>
                <span className="text-xs text-muted-foreground">
                  {layerLabel(factor.layer)} · {factor.why}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
