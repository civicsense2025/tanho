import type { PageStat } from "./queries";

/**
 * Per-page optimisation flags for the Traffic screen. Pure, heuristic hints
 * that mirror the design's suggestion chips. With only first-party pageview
 * counts we can't compute CTR, so these are volume-based nudges — richer flags
 * ("Low CTR", "Missing meta description") light up once Search Console is a
 * real data source. Kept intentionally conservative to avoid noise.
 */
export function pageSuggestion(page: PageStat, medianViews: number): string | null {
  if (page.views === 0) return "No views yet — check internal links to this page";
  if (medianViews > 0 && page.views < Math.max(1, medianViews * 0.25)) {
    return "Low traffic — tighten the title and meta description";
  }
  return null;
}

/** Median of a numeric list (0 for empty). Pure helper for the heuristic. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
