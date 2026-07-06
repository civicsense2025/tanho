import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { listPages } from "@/modules/pages/queries";
import { listRedirects } from "@/modules/redirects/queries";
import { seoAudit404, seoWebVitals } from "../schema";
import { WEB_VITALS_METRICS, type WebVitalMetric } from "./tracking";

/** A page missing one or more recommended metadata fields. */
export type CoverageGap = {
  route: string;
  title: string;
  missing: Array<"title" | "description" | "ogImage">;
};

/** Metadata coverage across published pages: which recommended fields are unset. */
export async function metadataCoverage(): Promise<{
  total: number;
  complete: number;
  gaps: CoverageGap[];
}> {
  const pages = (await listPages()).filter((p) => p.status === "published" && !p.noIndex);
  const gaps: CoverageGap[] = [];
  for (const p of pages) {
    const missing: CoverageGap["missing"] = [];
    if (!p.seoTitle && !p.title) missing.push("title");
    if (!p.seoDescription) missing.push("description");
    if (!p.ogImageMediaId) missing.push("ogImage");
    if (missing.length) gaps.push({ route: p.route, title: p.title, missing });
  }
  return { total: pages.length, complete: pages.length - gaps.length, gaps };
}

/** A set of pages that share an identical meta title or description. */
export type DuplicateGroup = { value: string; routes: string[] };

/** Duplicate meta titles + descriptions among indexable published pages. */
export async function duplicateMeta(): Promise<{
  titles: DuplicateGroup[];
  descriptions: DuplicateGroup[];
}> {
  const pages = (await listPages()).filter((p) => p.status === "published" && !p.noIndex);
  const group = (pick: (p: (typeof pages)[number]) => string): DuplicateGroup[] => {
    const byValue = new Map<string, string[]>();
    for (const p of pages) {
      const v = pick(p).trim();
      if (!v) continue;
      (byValue.get(v) ?? byValue.set(v, []).get(v)!).push(p.route);
    }
    return [...byValue.entries()]
      .filter(([, routes]) => routes.length > 1)
      .map(([value, routes]) => ({ value, routes }));
  };
  return {
    titles: group((p) => p.seoTitle || p.title),
    descriptions: group((p) => p.seoDescription),
  };
}

/** Published pages explicitly hidden from search (noindex). */
export async function noindexPages(): Promise<Array<{ route: string; title: string }>> {
  return (await listPages())
    .filter((p) => p.status === "published" && p.noIndex)
    .map((p) => ({ route: p.route, title: p.title }));
}

/** A redirect whose target is itself a redirect source (an inefficient hop). */
export type RedirectChain = { from: string; via: string; to: string };

/**
 * Redirect chains: any rule A→B where B is also a redirect source (B→C). Search
 * engines follow one hop grudgingly; chains waste crawl budget and link equity.
 * Also flags cycles (A→B→A) via the same lookup.
 */
export async function redirectChains(): Promise<RedirectChain[]> {
  const rules = await listRedirects();
  const byFrom = new Map(rules.map((r) => [r.fromPath, r.toPath]));
  const chains: RedirectChain[] = [];
  for (const r of rules) {
    const next = byFrom.get(r.toPath);
    if (next) chains.push({ from: r.fromPath, via: r.toPath, to: next });
  }
  return chains;
}

/** Most-hit 404 paths, for the broken-link report + redirect suggestions. */
export async function top404s(limit = 50): Promise<
  Array<{ id: string; path: string; referrer: string; count: number; lastAt: number }>
> {
  return db
    .select({
      id: seoAudit404.id,
      path: seoAudit404.path,
      referrer: seoAudit404.referrer,
      count: seoAudit404.count,
      lastAt: seoAudit404.lastAt,
    })
    .from(seoAudit404)
    .orderBy(desc(seoAudit404.count), desc(seoAudit404.lastAt))
    .limit(limit);
}

/** p75 (the CWV reporting standard) per metric over the recent window. */
export type VitalsSummary = Record<WebVitalMetric, { p75: number | null; samples: number }>;

export async function webVitalsSummary(days = 28): Promise<VitalsSummary> {
  const since = Date.now() - days * 86_400_000;
  const rows = await db
    .select({ metric: seoWebVitals.metric, value: seoWebVitals.value })
    .from(seoWebVitals)
    .where(sql`${seoWebVitals.at} >= ${since}`);

  const byMetric = new Map<string, number[]>();
  for (const r of rows) (byMetric.get(r.metric) ?? byMetric.set(r.metric, []).get(r.metric)!).push(r.value);

  const out = {} as VitalsSummary;
  for (const metric of WEB_VITALS_METRICS) {
    const vals = (byMetric.get(metric) ?? []).sort((a, b) => a - b);
    out[metric] = {
      samples: vals.length,
      p75: vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.75))] : null,
    };
  }
  return out;
}
