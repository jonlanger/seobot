import { Section } from "@/components/marketing/section";

/**
 * Hero chart grid — a small, animated mosaic of chart-like tiles that stands in
 * for the product UI. Transform/opacity only, loops are slow, and every tile is
 * decorative (the underlying data lives on the dashboard).
 */
const tiles = [
  // Bar chart
  <div className="flex h-full items-end gap-1.5">
    {[40, 65, 30, 80, 55].map((height, index) => (
      <div
        key={index}
        className="flex-1 origin-bottom rounded-sm bg-primary motion-safe:animate-grow-y"
        style={{ height: `${height}%`, animationDelay: `${index * 100}ms` }}
      />
    ))}
  </div>,
  // Line / sparkline
  <div className="relative h-full">
    <div className="absolute inset-x-0 bottom-3 h-px bg-border" />
    <div className="absolute left-0 top-2 h-0.5 w-2/3 origin-left rounded-full bg-chart-2 motion-safe:animate-grow-x" />
    <div className="absolute left-2/3 top-2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-2 motion-safe:animate-ping" />
  </div>,
  // Heatmap
  <div className="grid h-full grid-cols-3 grid-rows-3 gap-1">
    {Array.from({ length: 9 }).map((_, index) => (
      <div
        key={index}
        className="rounded-sm bg-primary motion-safe:animate-pulse"
        style={{
          opacity: 0.2 + (index % 4) * 0.2,
          animationDelay: `${index * 120}ms`,
        }}
      />
    ))}
  </div>,
  // Ring
  <div className="relative grid h-full place-items-center">
    <div className="size-16 rounded-full border-4 border-muted" />
    <div className="absolute size-16 animate-spin rounded-full border-4 border-transparent border-t-primary [animation-duration:6s]" />
  </div>,
  // Scatter
  <div className="relative h-full">
    {[
      [20, 30],
      [45, 60],
      [70, 25],
      [35, 75],
      [80, 55],
    ].map(([x, y], index) => (
      <div
        key={index}
        className="absolute size-2 rounded-full bg-chart-3 motion-safe:animate-ping"
        style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * 200}ms` }}
      />
    ))}
  </div>,
  // Stacked bars
  <div className="flex h-full items-end gap-2">
    {[70, 45].map((height, index) => (
      <div key={index} className="flex flex-1 flex-col justify-end gap-1">
        <div
          className="origin-bottom rounded-sm bg-chart-4 motion-safe:animate-grow-y"
          style={{ height: `${height}%`, animationDelay: `${index * 150}ms` }}
        />
        <div
          className="origin-bottom rounded-sm bg-muted motion-safe:animate-grow-y"
          style={{ height: `${100 - height}%`, animationDelay: `${index * 150 + 80}ms` }}
        />
      </div>
    ))}
  </div>,
];

export function ChartGrid() {
  return (
    <div className="container relative pb-16 pt-10 sm:pb-20 sm:pt-14">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile, index) => (
          <div
            key={index}
            className="aspect-square rounded-xl border border-border bg-surface p-3 shadow-xs motion-safe:animate-rise-in"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {tile}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartGridSection() {
  return (
    <Section className="border-t border-border">
      <ChartGrid />
    </Section>
  );
}