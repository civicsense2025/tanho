import { sql, type SQL } from "drizzle-orm";
import type { FieldDef, FieldKind } from "@/modules/custom-types/validation";
import { assertIdentifier, tableNameForSlug } from "./identifiers";
import type { Dialect } from "./dialect";

/**
 * DDL statement builders for the content-schema engine — the SQL half of
 * "creating a content type creates a real table."
 *
 * Every statement is a Drizzle `SQL` chunk built with `sql.identifier(...)`
 * for table/column names (so the driver quotes them per dialect) and bound
 * params for any values; the caller runs them with `db.run(...)`. Identifiers
 * are ALSO pre-validated with `assertIdentifier` before they reach here —
 * belt-and-suspenders over `sql.identifier`'s quoting, since DDL identifiers
 * can never be parameterized.
 *
 * One REAL typed column per field (not a single JSON blob — a content type is
 * meant to be a first-class table you can index and filter). The FieldKind →
 * column-type map is the only place that differs by dialect; structure-only
 * kinds (tags/json/repeater, and multi-reference) fall back to a JSON-ish text
 * column, matching what the static schema already does for JSON fields.
 */

/** Columns every ct_* table carries regardless of the owner's fields.
 *  `parent_id` + `path` back unbounded nesting: `parent_id` is the adjacency
 *  edge (the editing hierarchy), `path` is the materialized full URL path (the
 *  one-query routing key). See content-pages/router.ts. */
export const SPINE_COLUMNS = [
  "id",
  "slug",
  "title",
  "status",
  "sort_order",
  "parent_id",
  "path",
  "created_at",
  "updated_at",
] as const;

/** A field key that would collide with a spine column is rejected upstream. */
export const RESERVED_FIELD_KEYS: ReadonlySet<string> = new Set(SPINE_COLUMNS);

/**
 * SQL column type for a field kind, per dialect. Returned as a raw fragment
 * (safe — a fixed constant per kind, never user input). `text`-family kinds
 * (richtext/url/email/color/select/file/image/single-reference) all store as
 * text; number/currency as a float; boolean as an int flag (SQLite) or real
 * boolean (PG); date as ISO text (SQLite has no date type — matches the rest
 * of the codebase, which stores dates as text/epoch); tags/json/repeater and
 * multi-reference as JSON text (jsonb on PG).
 */
export function columnType(field: FieldDef, dialect: Dialect): string {
  const jsonType = dialect === "postgres" ? "jsonb" : "text";
  const isMultiRef = field.kind === "reference" && field.multi === true;
  if (isMultiRef) return jsonType;

  const kind: FieldKind = field.kind;
  switch (kind) {
    case "number":
    case "currency":
      return dialect === "postgres" ? "double precision" : "real";
    case "boolean":
      return dialect === "postgres" ? "boolean" : "integer";
    case "tags":
    case "json":
    case "repeater":
      return jsonType;
    case "text":
    case "richtext":
    case "date":
    case "select":
    case "url":
    case "email":
    case "color":
    case "file":
    case "image":
    case "reference":
      return "text";
  }
}

/** `<name> <type>` column clause for a field, as a raw string (validated key). */
function columnClause(field: FieldDef, dialect: Dialect): string {
  const key = assertIdentifier(field.key);
  return `${quoteIdent(key)} ${columnType(field, dialect)}`;
}

/**
 * Per-dialect identifier quoting for the raw-string clauses assembled inside a
 * single `sql.raw(...)` body (CREATE column list). Mirrors what
 * `sql.identifier` emits: double-quotes on both SQLite and Postgres, embedded
 * quotes doubled. Only ever receives an `assertIdentifier`-validated name.
 */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** The fixed spine column definitions, per dialect. */
function spineClauses(dialect: Dialect): string[] {
  const ts = dialect === "postgres" ? "bigint" : "integer";
  return [
    `"id" text PRIMARY KEY NOT NULL`,
    `"slug" text NOT NULL`,
    `"title" text NOT NULL DEFAULT ''`,
    `"status" text NOT NULL DEFAULT 'draft'`,
    `"sort_order" ${dialect === "postgres" ? "double precision" : "real"} NOT NULL DEFAULT 0`,
    // Nesting spine: adjacency edge + materialized full path. `path` defaults to
    // '' and is populated (= basePath/slug) on insert; a partial unique index is
    // added separately so blank paths on legacy rows don't collide.
    `"parent_id" text`,
    `"path" text NOT NULL DEFAULT ''`,
    `"created_at" ${ts} NOT NULL`,
    `"updated_at" ${ts} NOT NULL`,
  ];
}

/**
 * Postgres-only hardening for a freshly created ct_* table: enable + force RLS
 * and grant the `oys_app` role full row access. `ALTER DEFAULT PRIVILEGES` in
 * scripts/postgres-rls-force.sql already GRANTs table privileges to future
 * tables, but RLS enable + a policy are per-table and must be emitted here or
 * the app role reads zero rows. No-op on SQLite (no RLS).
 */
export function postgresRlsStatements(tableName: string): SQL[] {
  const t = sql.identifier(assertIdentifier(tableName));
  const policy = `${tableName}_app_only`;
  return [
    sql`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`,
    sql`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`,
    sql.raw(
      `CREATE POLICY ${quoteIdent(policy)} ON ${quoteIdent(tableName)} TO oys_app USING (true) WITH CHECK (true)`,
    ),
  ];
}

/**
 * Full `CREATE TABLE` for a content type (its spine + one column per field),
 * plus indexes. Returns the ordered statement list; on Postgres the RLS
 * statements are appended. `db.run` each, in order, inside the create action.
 *
 * Uniqueness is on `path` (the materialized full URL), NOT `slug`: hierarchical
 * types must allow the same leaf slug under different parents (e.g. two
 * `.../overview` pages), so slug is unique only *within a parent*, which
 * path-uniqueness captures exactly. For a flat type path == `{base}/{slug}`, so
 * a unique `path` still enforces unique slugs there. `slug` gets a plain
 * (non-unique) index for the by-slug lookups getRowBySlug still does. This
 * matches the constraint the one-time backfill (backfill-nesting.ts) adds to
 * pre-existing tables.
 */
export function createTableStatements(
  tableName: string,
  fields: FieldDef[],
  dialect: Dialect,
): SQL[] {
  const t = assertIdentifier(tableName);
  const cols = [...spineClauses(dialect), ...fields.map((f) => columnClause(f, dialect))];
  const stmts: SQL[] = [
    sql.raw(`CREATE TABLE ${quoteIdent(t)} (\n  ${cols.join(",\n  ")}\n)`),
    sql.raw(`CREATE UNIQUE INDEX ${quoteIdent(`${t}_path_unique`)} ON ${quoteIdent(t)} ("path")`),
    sql.raw(`CREATE INDEX ${quoteIdent(`${t}_slug_idx`)} ON ${quoteIdent(t)} ("slug")`),
  ];
  if (dialect === "postgres") stmts.push(...postgresRlsStatements(t));
  return stmts;
}

/** `ALTER TABLE ... ADD COLUMN` for one new field. */
export function addColumnStatement(tableName: string, field: FieldDef, dialect: Dialect): SQL {
  const t = quoteIdent(assertIdentifier(tableName));
  return sql.raw(`ALTER TABLE ${t} ADD COLUMN ${columnClause(field, dialect)}`);
}

/** `ALTER TABLE ... DROP COLUMN` for a removed field (SQLite 3.35+, PG native). */
export function dropColumnStatement(tableName: string, columnKey: string): SQL {
  const t = quoteIdent(assertIdentifier(tableName));
  const c = quoteIdent(assertIdentifier(columnKey));
  return sql.raw(`ALTER TABLE ${t} DROP COLUMN ${c}`);
}

/** `ALTER TABLE ... RENAME COLUMN` for a renamed field (SQLite 3.25+, PG native). */
export function renameColumnStatement(tableName: string, fromKey: string, toKey: string): SQL {
  const t = quoteIdent(assertIdentifier(tableName));
  const from = quoteIdent(assertIdentifier(fromKey));
  const to = quoteIdent(assertIdentifier(toKey));
  return sql.raw(`ALTER TABLE ${t} RENAME COLUMN ${from} TO ${to}`);
}

/** `DROP TABLE` for a deleted content type. */
export function dropTableStatement(tableName: string): SQL {
  const t = quoteIdent(assertIdentifier(tableName));
  return sql.raw(`DROP TABLE ${t}`);
}

export { tableNameForSlug };
