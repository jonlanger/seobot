/**
 * Key findings — the study's headline results as plain cards, grouped by where they
 * sit in the crawl → read → quote pipeline, each with an optional link into the Linked
 * Explorer pre-filtered to the sites behind the number.
 *
 * Every figure comes from `signal-map.ts`, which derives it from `topSitesStudy` at
 * import time; nothing here is typed. This module only chooses the order, drops the
 * canvas-only nodes (positions, chips), and attaches the Explorer filters.
 */
import { signalClusters, signalEdges, signalNodes } from "./signal-map";
import type { SignalHue } from "./signal-map";
import { crawlerGroups } from "./top-sites";

/** Explorer URL params (`c`, `bl`, `b`, `l`, `f.<facet>`) — see `useSiteFilters`. */
export type ExplorerQuery = Record<string, string>;

export interface KeyFinding {
  id: string;
  /** What is measured. */
  label: string;
  /** The reading, big. */
  value: string;
  /** One line of context. */
  sub: string;
  /** The takeaway in show-the-number form. */
  note: string;
  /** Opens the Explorer showing the sites behind this number. */
  explore?: { label: string; query: ExplorerQuery };
  /** Marks the group's headline finding. */
  headline: boolean;
}

export interface KeyFindingGroup {
  id: string;
  title: string;
  /** The question this group answers. */
  question: string;
  hue: SignalHue;
  findings: KeyFinding[];
}

export interface KeyRelationship {
  id: string;
  label: string;
  note: string;
  /** The two findings it connects, by label. */
  between: [string, string];
  kind: "strong" | "context" | "none";
}

const tokensOf = (groupId: string) => crawlerGroups.find((group) => group.id === groupId)?.tokens.join(",") ?? "";

/** Which sites sit behind each finding. Omitted → the number is a summary with no site set to open. */
const exploreById: Record<string, { label: string; query: ExplorerQuery }> = {
  "read-readable": { label: "See the readable sites", query: { c: "measured" } },
  "read-walled": { label: "See the walled sites", query: { c: "raw_blocked,both_blocked" } },
  "read-excluded": { label: "See the excluded sites", query: { c: "robots_excluded" } },
  "read-render": { label: "See these sites", query: { c: "render_incomplete,render_failed" } },
  "coverage-top": { label: "See the 90%+ club", query: { b: "9" } },
  "access-ai": { label: "See the sites that block", query: { bl: tokensOf("ai-retrieval") } },
  "access-training": { label: "See the sites that block", query: { bl: tokensOf("training-policy") } },
  "access-classic": { label: "See the sites that block", query: { bl: tokensOf("classic-search") } },
  "vert-band": { label: "Compare the verticals", query: { l: "vertical" } },
  "reach-rank": { label: "Browse by rank", query: {} },
};

/** Narrative order: lead with the gate, then how much survives, then who is let in. */
const groupOrder = ["read", "coverage", "access", "structure", "verticals", "reach"];

export const keyFindingGroups: KeyFindingGroup[] = groupOrder.flatMap((clusterId) => {
  const cluster = signalClusters.find((candidate) => candidate.id === clusterId);
  if (!cluster) return [];
  const findings = signalNodes
    .filter((node) => node.cluster === clusterId && (node.kind === "hub" || node.kind === "stat"))
    // hubs first: they carry the group's headline
    .sort((a, b) => Number(b.kind === "hub") - Number(a.kind === "hub"))
    .map<KeyFinding>((node) => ({
      id: node.id,
      label: node.label,
      value: node.value,
      sub: node.sub,
      note: node.note,
      explore: exploreById[node.id],
      headline: node.kind === "hub",
    }));
  return [{ id: cluster.id, title: cluster.title, question: cluster.tagline, hue: cluster.hue, findings }];
});

const labelOf = (nodeId: string) => signalNodes.find((node) => node.id === nodeId)?.label;

/** How the findings relate — only the edges that carry a stated takeaway. */
export const keyRelationships: KeyRelationship[] = signalEdges.flatMap((edge) => {
  if (!edge.note || (edge.kind !== "strong" && edge.kind !== "context" && edge.kind !== "none")) return [];
  const from = labelOf(edge.from);
  const to = labelOf(edge.to);
  if (!from || !to) return [];
  return [{ id: edge.id, label: edge.label ?? `${from} → ${to}`, note: edge.note, between: [from, to] as [string, string], kind: edge.kind }];
});
