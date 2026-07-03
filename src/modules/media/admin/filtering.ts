import type { MediaWithUsage } from "../queries";
import { needsAlt, needsCredit } from "../licenses";

/**
 * Client-side filter model for the library screen. The full (small) asset
 * list ships to the client once; every toolbar interaction filters locally
 * for instant feedback. Server-side equivalents live in queries.ts.
 */

export type KindFilter = "all" | "image" | "video" | "doc";

export type FiltersState = {
  q: string;
  kind: KindFilter;
  needsAlt: boolean;
  needsCredit: boolean;
  tags: string[];
};

export const EMPTY_FILTERS: FiltersState = {
  q: "",
  kind: "all",
  needsAlt: false,
  needsCredit: false,
  tags: [],
};

export const anyFilterActive = (f: FiltersState): boolean =>
  f.q.trim() !== "" || f.kind !== "all" || f.needsAlt || f.needsCredit || f.tags.length > 0;

/** Sorted union of every tag in the library — feeds the tag pill row. */
export function tagUnion(rows: MediaWithUsage[]): string[] {
  const set = new Set<string>();
  for (const r of rows) for (const t of r.tags) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

const matchesQuery = (r: MediaWithUsage, q: string): boolean => {
  const hay = [r.name, r.alt, r.credit, r.source, ...r.tags].join(" ").toLowerCase();
  return hay.includes(q);
};

/** Filters compose with AND; selected tags match with OR (any-of). */
export function applyFilters(rows: MediaWithUsage[], f: FiltersState): MediaWithUsage[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.kind !== "all" && r.kind !== f.kind) return false;
    if (f.needsAlt && !needsAlt(r)) return false;
    if (f.needsCredit && !needsCredit(r)) return false;
    if (f.tags.length && !f.tags.some((t) => r.tags.includes(t))) return false;
    if (q && !matchesQuery(r, q)) return false;
    return true;
  });
}

export const toggleInList = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
