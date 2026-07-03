import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { DataSourceAllowlistEntry } from "./validation";

/**
 * Admin-configured connections to EXTERNAL databases (Postgres, Supabase —
 * later Turso/MongoDB), so bound blocks can read live rows from a
 * self-hoster's own data without the platform hardcoding any vendor.
 *
 * Unlike `integrationConnections` (one row per provider — a self-hoster has
 * exactly one Google Calendar), `id` is the primary key here because a
 * self-hoster may connect several databases of the same provider type
 * (e.g. two separate Postgres instances).
 *
 * `configEncrypted` is an AES-GCM sealed blob (sealJson, see
 * data-sources/crypto.ts) holding whatever the provider needs (host, port,
 * database, user, password / project ref + service key) — never stored in
 * plaintext, never sent to the client. `allowlistJson` is the actual
 * security boundary for querying: only tables/columns an owner explicitly
 * lists here may ever be read, re-checked on every query regardless of
 * what a block's saved content claims.
 */
export const dataSourceConnections = sqliteTable("data_source_connections", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  provider: text("provider", { enum: ["postgres", "supabase"] }).notNull(),
  /** AES-GCM sealed JSON credential blob (secretbox token). */
  configEncrypted: text("config_encrypted").notNull(),
  allowlistJson: text("allowlist_json", { mode: "json" })
    .$type<DataSourceAllowlistEntry[]>()
    .notNull()
    .default([]),
  /** Non-secret status for the admin list screen (never gates queries). */
  status: text("status", { enum: ["connected", "error", "unverified"] })
    .notNull()
    .default("unverified"),
  /**
   * Nullable FK to `dataSourceOAuthConnections` — set when this row was
   * spawned via the Supabase OAuth-first connect flow (create or connect
   * an existing project); null for manually-entered connections. One OAuth
   * connection can spawn many of these rows.
   */
  oauthConnectionId: text("oauth_connection_id"),
  createdBy: text("created_by"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * DB-backed sliding-window limiter for data-source query + connection-test
 * traffic — same shape as auth/rate-limit.ts's loginAttempts, deliberately
 * NOT the in-memory analytics pattern (external DB credentials are
 * security-sensitive; in-memory state doesn't survive serverless cold
 * starts or multi-instance deploys).
 */
export const dataSourceQueryAttempts = sqliteTable("data_source_query_attempts", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(0),
});

export type DataSourceConnectionRow = typeof dataSourceConnections.$inferSelect;
