import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, studyFacts } from "@/content/study-facts";

/**
 * Illustrations for the home highlights. Each one is decorative (aria-hidden):
 * the number and sentence beside it carry the claim. They settle into place once,
 * when scrolled into view, then idle with at most one slow ambient loop.
 * `prefers-reduced-motion` skips straight to the final state (see `useInView`).
 */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

function useCountUp(active: boolean, to: number, ms = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(to * (1 - Math.pow(1 - t, 4)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, ms]);
  return value;
}

/* ------------------------------ Study sample ------------------------------ */

const COLS = 25;
const ROWS = 20;
/** The grid is a fixed 500-cell sample of the study, scaled to the real readable / walled / excluded mix. */
const { waffle } = studyFacts;

/** Deterministic shuffle so the readable / walled mix looks scattered, not banded. */
function dotKinds() {
  const order = Array.from({ length: COLS * ROWS }, (_, i) => i);
  let seed = 64;
  for (let i = order.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const kinds: ("readable" | "walled" | "other")[] = new Array(COLS * ROWS).fill("other");
  order.forEach((cell, rank) => {
    kinds[cell] = rank < waffle.readable ? "readable" : rank < waffle.readable + waffle.unreadable ? "walled" : "other";
  });
  return kinds;
}
const KINDS = dotKinds();

export function StudyDots() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} aria-hidden className="relative w-full max-w-sm overflow-hidden">
      <svg viewBox={`0 0 ${COLS * 12} ${ROWS * 12}`} className="block w-full">
        {KINDS.map((kind, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          return (
            <circle
              key={i}
              cx={c * 12 + 6}
              cy={r * 12 + 6}
              r={3.1}
              className={cn(
                kind === "readable" && "fill-primary",
                kind === "walled" && "fill-destructive",
                kind === "other" && "fill-muted-foreground/40",
              )}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                transform: inView ? "scale(1)" : "scale(0)",
                opacity: inView ? (kind === "readable" ? 0.9 : kind === "walled" ? 0.85 : 0.6) : 0,
                transition: `transform 700ms ${EASE}, opacity 700ms ${EASE}`,
                transitionDelay: `${(c + r) * 22}ms`,
              }}
            />
          );
        })}
      </svg>
      {/* One slow sweep of light across the field. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 motion-safe:animate-scan-x">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      </div>
    </div>
  );
}

/* -------------------------------- Readability ------------------------------- */

export function ReadabilityRing() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const shown = useCountUp(inView, studyFacts.readablePct);
  const R = 76;
  const C = 2 * Math.PI * R;
  const arc = (pct: number, offsetPct: number) => ({
    strokeDasharray: `${inView ? (C * pct) / 100 - 3 : 0} ${C}`,
    strokeDashoffset: -((C * offsetPct) / 100),
    transition: `stroke-dasharray 1400ms ${EASE} ${offsetPct ? 250 : 0}ms`,
  });
  return (
    <div ref={ref} aria-hidden className="flex items-center gap-8">
      <div className="relative size-48 shrink-0">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="1" className="stroke-border" />
          <circle cx="100" cy="100" r={R - 14} fill="none" strokeWidth="1" strokeDasharray="2 5" className="stroke-border" />
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-primary" style={arc(studyFacts.readablePct, 0)} />
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-destructive" style={arc(studyFacts.unreadablePct, studyFacts.readablePct + 0.8)} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {shown.toFixed(1)}
            <span className="text-lg text-muted-foreground">%</span>
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" /> Readable <span className="font-mono tabular-nums text-foreground">{fmt(studyFacts.readable)}</span>
        </li>
        <li className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full bg-destructive" /> Walled <span className="font-mono tabular-nums text-foreground">{fmt(studyFacts.unreadable)}</span>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------ Crawler access ------------------------------ */

/** 50 cells stand for 50 robots.txt files; the locked ones are the real share that turn away an AI search crawler. */
const BLOCKED = new Set(
  // 17 is coprime with 50, so k·17 mod 50 visits distinct cells — a scattered, stable pattern.
  Array.from({ length: Math.round(studyFacts.retrievalBlockedPct / 2) }, (_, k) => (k * 17 + 3) % 50),
);

export function CrawlerGrid() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} aria-hidden className="grid w-full max-w-sm grid-cols-10 gap-1.5">
      {Array.from({ length: 50 }).map((_, i) => {
        const blocked = BLOCKED.has(i);
        return (
          <div
            key={i}
            className={cn(
              "relative grid aspect-square place-items-center rounded-md border transition-colors duration-700",
              blocked && inView ? "border-destructive/40 bg-destructive-soft" : "border-border bg-muted/60",
            )}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(6px)",
              transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}, background-color 700ms, border-color 700ms`,
              transitionDelay: blocked && inView ? `${700 + (i % 10) * 90}ms, ${700 + (i % 10) * 90}ms, ${900 + (i % 7) * 120}ms, ${900 + (i % 7) * 120}ms` : `${(i % 10) * 28 + Math.floor(i / 10) * 40}ms`,
            }}
          >
            {blocked && (
              <>
                <Lock className="size-[45%] text-destructive-soft-foreground" />
                <span
                  className="absolute inset-0 rounded-md border border-destructive/50 motion-safe:animate-ring-out"
                  style={{ animationDelay: `${(i % 5) * 0.6}s` }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- Coverage --------------------------------- */

export function CoverageRange() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const ticks = [0, 25, 50, 75, 100];
  const mark = (pct: number, label: string, delay: number, tone: string, row = 0) => (
    <div
      className="absolute top-1/2 flex flex-col items-center gap-1.5"
      style={{ left: `${pct}%`, opacity: inView ? 1 : 0, transition: `opacity 700ms ${EASE} ${delay}ms` }}
    >
      <span className={cn("size-2.5 -translate-y-1/2 rounded-full ring-4 ring-background", tone)} />
      <span
        className="whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground"
        style={{ marginTop: row * 16 + 14 }}
      >
        {label}
      </span>
    </div>
  );
  return (
    <div ref={ref} aria-hidden className="w-full max-w-md pb-10 pt-12">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        {ticks.map((t) => (
          <div key={t} className="absolute top-1/2" style={{ left: `${t}%` }}>
            <span className="absolute left-0 top-0 h-2 w-px -translate-x-1/2 bg-border" />
            <span className="absolute -top-5 left-0 -translate-x-1/2 font-mono text-[10px] tabular-nums text-muted-foreground/70">{t}</span>
          </div>
        ))}
        {/* Interquartile band, p25 → p75 */}
        <div
          className="absolute top-1/2 h-6 -translate-y-1/2 origin-left rounded-md border border-primary/40 bg-primary/15"
          style={{
            left: `${studyFacts.coverage.p25}%`,
            width: `${studyFacts.coverage.p75 - studyFacts.coverage.p25}%`,
            transform: `translateY(-50%) scaleX(${inView ? 1 : 0})`,
            transition: `transform 1300ms ${EASE} 200ms`,
          }}
        />
        {/* Median */}
        <div
          className="absolute top-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${studyFacts.coverage.median}%`, height: inView ? 40 : 0, transition: `height 900ms ${EASE} 900ms` }}
        />
        <div
          className="absolute -top-12 -translate-x-1/2 font-mono text-xs tabular-nums text-foreground"
          style={{ left: `${studyFacts.coverage.median}%`, opacity: inView ? 1 : 0, transition: `opacity 700ms ${EASE} 1300ms` }}
        >
          median {studyFacts.coverage.median}%
        </div>
        {/* Segment outliers from the study */}
        {studyFacts.verticalMedians.search !== null &&
          mark(studyFacts.verticalMedians.search, `search ${studyFacts.verticalMedians.search}`, 1100, "bg-muted-foreground")}
        {studyFacts.verticalMedians.social !== null &&
          mark(studyFacts.verticalMedians.social, `social ${studyFacts.verticalMedians.social}`, 1250, "bg-destructive", 1)}
      </div>
    </div>
  );
}

/* ----------------------------- Structured data ------------------------------ */

const LINE_WIDTHS = [72, 54, 86, 40, 64, 78, 46];

export function RenderGap() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const lines = (filled: boolean) =>
    LINE_WIDTHS.map((w, i) => (
      <div
        key={i}
        className={cn("h-1.5 origin-left rounded-full", filled ? "bg-primary/45" : i === 2 || i === 3 || i === 5 ? "border border-dashed border-border bg-transparent" : "bg-muted-foreground/25")}
        style={{
          width: `${w}%`,
          transform: `scaleX(${inView ? 1 : 0})`,
          transition: `transform 900ms ${EASE}`,
          transitionDelay: `${(filled ? 700 : 100) + i * 70}ms`,
        }}
      />
    ));
  return (
    <div ref={ref} aria-hidden className="grid w-full max-w-md grid-cols-2 gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Raw HTML</span>
        <div className="flex flex-col gap-2.5 pt-1">{lines(false)}</div>
        <span className="mt-1 font-mono text-[11px] text-muted-foreground/80">no JSON-LD</span>
      </div>
      <div className="relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-primary/30 bg-surface p-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary-soft-foreground">Rendered DOM</span>
        <div className="flex flex-col gap-2.5 pt-1">{lines(true)}</div>
        <span
          className="mt-1 w-fit rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-[11px] text-primary-soft-foreground"
          style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(4px)", transition: `opacity 700ms ${EASE} 1500ms, transform 700ms ${EASE} 1500ms` }}
        >
          {"{ } JSON-LD"}
        </span>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 motion-safe:animate-scan-x [animation-delay:1.5s]">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        </div>
      </div>
    </div>
  );
}
