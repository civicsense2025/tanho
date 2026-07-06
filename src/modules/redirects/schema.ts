import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** One typed condition a rule may gate on (Vercel `has`/`missing` shape). */
export type RedirectCondition = {
  op: "has" | "missing";
  type: "header" | "cookie" | "query" | "host" | "country" | "language";
  key?: string;
  value?: string;
};

/**
 * URL redirects, resolved in the proxy (see src/proxy.ts) before any route.
 *
 * The original three columns — `fromPath` (unique exact key), `toPath`, `code`
 * — are retained so existing rows and the exact-match fast path keep working
 * unchanged. The added columns turn this into a superset rule model (match
 * types, rule kinds, conditions, ordering, ops) without a breaking change:
 * every new column has a default that makes a legacy row a valid exact 301.
 *
 * Same-origin is enforced on write AND re-checked at redirect time (no open
 * redirects); an identity rule (normalized from === to) is never stored — see
 * isIdentityRedirect in ./validation.
 */
export const redirects = sqliteTable(
  "redirects",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    /** Exact source path for exact rules; the literal lookup key. */
    fromPath: text("from_path").notNull().unique(),
    /** Exact destination (kept in sync with `destination` for exact rules). */
    toPath: text("to_path").notNull(),
    /** HTTP status: 301/302/307/308 for redirects, 410/451 for gone. */
    code: integer("code").notNull().default(301),

    /** exact | prefix | wildcard | regex. */
    matchType: text("match_type").notNull().default("exact"),
    /** redirect | rewrite | gone. */
    kind: text("kind").notNull().default("redirect"),
    /** Compiled source pattern for wildcard/regex rules (null for exact). */
    pattern: text("pattern"),
    /** Destination for pattern rules; null for `gone`. Exact rules use toPath. */
    destination: text("destination"),
    /** Per-rule case sensitivity (default: case-insensitive path match). */
    caseSensitive: integer("case_sensitive", { mode: "boolean" }).notNull().default(false),
    /** Keep the request query string on the redirect target. */
    preserveQuery: integer("preserve_query", { mode: "boolean" }).notNull().default(true),

    /** Sort key within a specificity class (first-match ordering). */
    position: integer("position").notNull().default(0),
    /** Toggle a rule off without deleting it. */
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    /** Organizational bucket for the admin list. */
    groupName: text("group_name").notNull().default(""),
    /** `has`/`missing` typed conditions the rule gates on. */
    conditions: text("conditions", { mode: "json" }).$type<RedirectCondition[]>().notNull().default([]),

    /** Times this rule has fired (best-effort usage tracking). */
    hitCount: integer("hit_count").notNull().default(0),
    /** Epoch ms of the last time this rule fired. */
    lastAt: integer("last_at"),
    /** Import batch id — lets a whole migration's redirects roll back as a unit. */
    sourceBatch: text("source_batch"),
    /** Provenance: manual | slug-change | import. */
    autoCreatedFrom: text("auto_created_from"),

    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [
    // Pattern rules are scanned in order; exact rules hit the unique index above.
    index("redirects_enabled_pos_idx").on(t.enabled, t.position),
    index("redirects_batch_idx").on(t.sourceBatch),
  ],
);
