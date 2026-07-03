import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * First-party analytics events. Deliberately minimal and PII-free: an anon
 * `sessionId` (from a random cookie, never a fingerprint), a validated event
 * `name`, the `path`, and a small `props` bag. `personId` is set only when a
 * logged-in reader fires the event. See docs/entities/analytics.md.
 */
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    at: integer("at")
      .notNull()
      .$defaultFn(() => Date.now()),
    /** Allowlisted event name: ^[a-z0-9_]+$ (e.g. pageview, cta_click). */
    name: text("name").notNull(),
    path: text("path").notNull().default(""),
    /** Anonymous per-browser session id from an httpOnly cookie. */
    sessionId: text("session_id").notNull().default(""),
    /** Set only for authenticated readers; null for anonymous visitors. */
    personId: text("person_id"),
    /** Small JSON bag of non-PII props (size-capped on write). */
    props: text("props", { mode: "json" })
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default({}),
  },
  (t) => [index("analytics_events_name_at_idx").on(t.name, t.at)],
);

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect;
