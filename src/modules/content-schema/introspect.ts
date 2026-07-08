import { sql } from "drizzle-orm";
import { rawAll } from "@/lib/db/raw";
import { assertIdentifier } from "./identifiers";
import { currentDialect } from "./dialect";
import { SPINE_COLUMNS } from "./ddl";
import type { FieldKind } from "@/modules/custom-types/validation";

/**
 * Runtime reflection of a `ct_*` table's real shape, for the "verify content
 * schema" reconcile action — the safety net for the parallel migration lane
 * (content-type tables live outside drizzle/*.sql, so nothing else tracks
 * them). Dialect-aware exactly like the search adapters already are:
 * `sqlite_master`/PRAGMA on SQLite (src/adapters/search/fts5.ts), the
 * `information_schema` on Postgres (src/adapters/data-source/postgres.ts).
 */

/** Whether a physical table currently exists. */
export async function tableExists(tableName: string): Promise<boolean> {
  const t = assertIdentifier(tableName);
  if (currentDialect() === "postgres") {
    const rows = await rawAll<{ one: number }>(
      sql`SELECT 1 AS one FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${t} LIMIT 1`,
    );
    return rows.length > 0;
  }
  const rows = await rawAll<{ one: number }>(
    sql`SELECT 1 AS one FROM sqlite_master WHERE type = 'table' AND name = ${t} LIMIT 1`,
  );
  return rows.length > 0;
}

/** The column names currently present on a table (empty if it doesn't exist). */
export async function tableColumns(tableName: string): Promise<string[]> {
  const t = assertIdentifier(tableName);
  if (currentDialect() === "postgres") {
    const rows = await rawAll<{ column_name: string }>(
      sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t} ORDER BY ordinal_position`,
    );
    return rows.map((r) => r.column_name);
  }
  // PRAGMA can't be parameterized or take a bound arg via the sql template, so
  // interpolate the already-validated identifier directly.
  const rows = await rawAll<{ name: string }>(
    sql.raw(`PRAGMA table_info("${t.replace(/"/g, '""')}")`),
  );
  return rows.map((r) => r.name);
}

/** A column's name + DB type + nullability, for the import-from-DB tool. */
export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
};

/**
 * Platform system tables that should never appear in the import-from-DB list.
 * These are the Drizzle-managed tables the platform owns; a user-created table
 * (or a `ct_*` table not yet registered) is a valid import candidate.
 */
const PLATFORM_TABLES = new Set([
  "pages",
  "block_sets",
  "products",
  "product_variants",
  "product_collections",
  "collections",
  "custom_types",
  "entries",
  "settings",
  "media",
  "data_source_connections",
  "integration_connections",
  "search_index",
  "search_content",
  "audit_log",
  "users",
  "team_members",
  "team_invites",
  "sessions",
  "orders",
  "order_items",
  "membership_tiers",
  "member_subscriptions",
  "bookings",
  "reviews",
  "redirects",
  "tags",
  "onboarding_state",
  "__drizzle_migrations",
  "sqlite_sequence",
]);

/** All user-importable tables in the platform DB (excludes system tables). */
export async function listTables(): Promise<string[]> {
  if (currentDialect() === "postgres") {
    const rows = await rawAll<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    return rows.map((r) => r.table_name).filter((n) => !PLATFORM_TABLES.has(n));
  }
  const rows = await rawAll<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return rows.map((r) => r.name).filter((n) => !PLATFORM_TABLES.has(n));
}

/**
 * Column info (name + type + nullability) for a table, for the import-from-DB
 * tool's auto-detect step. Returns spine columns too — the caller filters them.
 */
export async function tableColumnInfo(tableName: string): Promise<ColumnInfo[]> {
  const t = assertIdentifier(tableName);
  if (currentDialect() === "postgres") {
    const rows = await rawAll<{ column_name: string; data_type: string; is_nullable: string }>(
      sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t} ORDER BY ordinal_position`,
    );
    return rows.map((r) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === "YES",
    }));
  }
  // PRAGMA table_info: cid, name, type, notnull, dflt_value, pk
  const rows = await rawAll<{ name: string; type: string; notnull: number }>(
    sql.raw(`PRAGMA table_info("${t.replace(/"/g, '""')}")`),
  );
  return rows.map((r) => ({
    name: r.name,
    type: r.type,
    nullable: r.notnull === 0,
  }));
}

/** The spine column names every ct_* table has (re-exported for convenience). */
export { SPINE_COLUMNS };

/**
 * Infer a FieldKind from a DB column type. Maps common SQLite + Postgres
 * types to the closest FieldKind. Text-like types → text, int → number or
 * boolean (if the name suggests a flag), float → number/currency, json/jsonb
 * → json, date/timestamp → date, everything else → text.
 *
 * Pure function — no DB access, safe to call from client components.
 */
export function inferFieldKind(column: ColumnInfo): FieldKind {
  const t = column.type.toLowerCase();
  if (t === "boolean" || t === "bool") return "boolean";
  if (t === "json" || t === "jsonb") return "json";
  if (t.includes("date") || t.includes("timestamp") || t.includes("time"))
    return "date";
  if (t === "real" || t === "float" || t === "double" || t.includes("double precision") || t.includes("numeric"))
    return "number";
  if (t === "integer" || t === "int" || t.includes("int")) {
    // Heuristic: column names that look like flags → boolean
    if (/^(is_|has_|can_|should_|enabled|visible|active|published|public)/.test(column.name))
      return "boolean";
    // Heuristic: names with "price", "cost", "amount" → currency
    if (/(price|cost|amount|cents|total|fee)/.test(column.name)) return "currency";
    return "number";
  }
  if (t === "text" || t.includes("varchar") || t.includes("char")) {
    // Heuristic: names with "url" or "link" → url
    if (/(url|link|href)/.test(column.name)) return "url";
    // Heuristic: names with "email" → email
    if (/email/.test(column.name)) return "email";
    // Heuristic: names with "color" or "colour" → color
    if (/(color|colour)/.test(column.name)) return "color";
    // Heuristic: names with "tag" or "tags" → tags
    if (/(^|_)(tags?)(_|$)/.test(column.name)) return "tags";
  }
  return "text";
}

/** A table candidate for import, with its columns and inferred field kinds. */
export type TableCandidate = {
  tableName: string;
  columns: ColumnInfo[];
  /** Columns that are spine columns (auto-excluded from field mapping). */
  spineColumns: string[];
  /** Columns that could become content-type fields. */
  fieldColumns: Array<{ column: ColumnInfo; inferredKind: FieldKind }>;
};
