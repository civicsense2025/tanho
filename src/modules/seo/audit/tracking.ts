import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { seoAudit404, seoWebVitals } from "../schema";

/** The Core Web Vitals metrics we accept (the web-vitals library's set). */
export const WEB_VITALS_METRICS = ["LCP", "CLS", "INP", "FCP", "TTFB"] as const;
export type WebVitalMetric = (typeof WEB_VITALS_METRICS)[number];
const RATINGS = new Set(["good", "needs-improvement", "poor"]);

// seo_web_vitals is append-only (one row per sample), so bound its growth: the
// dashboard only reads the last 28 days, and an unauthenticated beacon could
// otherwise be used to bloat the table. Every Nth insert opportunistically
// prunes rows past the retention window — no cron needed, cost amortized.
const VITALS_RETENTION_MS = 60 * 86_400_000; // 60 days (> the 28-day report window)
const VITALS_SWEEP_EVERY = 200;
let vitalsInsertCount = 0;

/**
 * Record a 404 hit, deduped by path: increments `count` and bumps `lastAt` on
 * an existing row, else inserts a new one. Never throws — a logging failure
 * must not turn a 404 render into a 500. Ignores absurdly long paths.
 */
export async function record404(path: string, referrer = ""): Promise<void> {
  const p = (path ?? "").slice(0, 512);
  if (!p.startsWith("/")) return;
  const ref = (referrer ?? "").slice(0, 512);
  try {
    await db
      .insert(seoAudit404)
      .values({ path: p, referrer: ref, count: 1 })
      .onConflictDoUpdate({
        target: seoAudit404.path,
        set: {
          count: sql`${seoAudit404.count} + 1`,
          lastAt: Date.now(),
          referrer: ref || sql`${seoAudit404.referrer}`,
        },
      });
  } catch (err) {
    console.error("[seo] record404 failed", err);
  }
}

/**
 * Record one Core Web Vitals sample. Validates the metric + rating against the
 * known sets, clamps the value, and never throws (RUM must not break a request).
 */
export async function recordWebVitals(input: {
  path?: string;
  metric: string;
  value: number;
  rating?: string;
}): Promise<void> {
  if (!(WEB_VITALS_METRICS as readonly string[]).includes(input.metric)) return;
  if (!Number.isFinite(input.value)) return;
  const value = Math.max(0, Math.min(input.value, 3_600_000)); // cap at 1h of ms
  const rating = RATINGS.has(input.rating ?? "") ? input.rating! : "";
  try {
    await db.insert(seoWebVitals).values({
      path: (input.path ?? "").slice(0, 512),
      metric: input.metric,
      value,
      rating,
    });
    // Amortized retention sweep — keeps the append-only table bounded.
    if (++vitalsInsertCount % VITALS_SWEEP_EVERY === 0) {
      await db.delete(seoWebVitals).where(sql`${seoWebVitals.at} < ${Date.now() - VITALS_RETENTION_MS}`);
    }
  } catch (err) {
    console.error("[seo] recordWebVitals failed", err);
  }
}
