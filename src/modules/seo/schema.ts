import { createId } from "@paralleldrive/cuid2";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Audit trail of slug/route renames. Every time a page or content row changes
 * its public path, the old→new mapping is recorded here (and a 301 redirect is
 * created) so inbound links and search rankings survive the rename. `entityType`
 * distinguishes the source ("page" | "entry" | "content-row"); `entityId` is
 * that record's id.
 */
export const slugHistory = sqliteTable(
  "slug_history",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    oldPath: text("old_path").notNull(),
    newPath: text("new_path").notNull(),
    at: integer("at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [index("slug_history_entity_idx").on(t.entityType, t.entityId)],
);

/**
 * Requested URLs that resolved to a 404, deduped by path with a hit `count` and
 * `lastAt`. Feeds the SEO audit's broken-link report + one-click redirect
 * suggestions. `referrer` is the most recent referring URL (best-effort).
 */
export const seoAudit404 = sqliteTable(
  "seo_audit_404",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    path: text("path").notNull().unique(),
    referrer: text("referrer").notNull().default(""),
    count: integer("count").notNull().default(1),
    lastAt: integer("last_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [index("seo_audit_404_last_idx").on(t.lastAt)],
);

/**
 * Core Web Vitals field samples (RUM). One row per reported metric per page
 * view; the audit dashboard aggregates (p75) over a window. `metric` is one of
 * LCP/CLS/INP/FCP/TTFB; `rating` is the web-vitals lib's good|needs-improvement|
 * poor bucket. No PII — just the path + metric.
 */
export const seoWebVitals = sqliteTable(
  "seo_web_vitals",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    path: text("path").notNull().default(""),
    metric: text("metric").notNull(),
    value: real("value").notNull(),
    rating: text("rating").notNull().default(""),
    at: integer("at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [index("seo_web_vitals_metric_idx").on(t.metric, t.at)],
);
