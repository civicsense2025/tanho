import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertIdentifier } from "./identifiers";

/**
 * Generic row CRUD against a runtime-created `ct_*` content-type table.
 *
 * These tables have no compile-time Drizzle table object, so the ORM query
 * builder (`db.insert(table)`, etc.) can't target them — building a table
 * object at runtime and passing it to the builder is unsupported in
 * drizzle-orm 0.45.x. Instead we use Drizzle's `sql` template with
 * `sql.identifier(...)` for table/column names (driver-quoted, per-dialect)
 * and bound params for values, run via `db.run` (writes) / `db.all` (reads).
 * Every identifier is `assertIdentifier`-validated before use.
 *
 * A "row" is a plain record keyed by column name. Callers are responsible for
 * only passing keys that exist as columns (validated against the type's field
 * defs / spine upstream) — this layer trusts its inputs the way a typed
 * Drizzle call would, but still hard-validates identifier SHAPE so nothing
 * unsafe reaches SQL.
 */
export type ContentRow = Record<string, unknown>;

/** A `"col"` identifier chunk for a validated column name. */
function ident(name: string) {
  return sql.identifier(assertIdentifier(name));
}

/** List rows, newest-by-sort first, capped. */
export async function listRows(
  tableName: string,
  opts: { limit?: number; onlyPublished?: boolean } = {},
): Promise<ContentRow[]> {
  const t = ident(tableName);
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const where = opts.onlyPublished ? sql` WHERE "status" = ${"published"}` : sql``;
  const rows = await db.all<ContentRow>(
    sql`SELECT * FROM ${t}${where} ORDER BY "sort_order" ASC, "title" ASC LIMIT ${limit}`,
  );
  return rows;
}

/** One row by its slug (the per-row URL segment), or null. */
export async function getRowBySlug(
  tableName: string,
  slug: string,
  opts: { onlyPublished?: boolean } = {},
): Promise<ContentRow | null> {
  const t = ident(tableName);
  const pub = opts.onlyPublished ? sql` AND "status" = ${"published"}` : sql``;
  const rows = await db.all<ContentRow>(
    sql`SELECT * FROM ${t} WHERE "slug" = ${slug}${pub} LIMIT 1`,
  );
  return rows[0] ?? null;
}

/** Fetch a row by id (any status). */
export async function getRowById(tableName: string, id: string): Promise<ContentRow | null> {
  const t = ident(tableName);
  const rows = await db.all<ContentRow>(sql`SELECT * FROM ${t} WHERE "id" = ${id} LIMIT 1`);
  return rows[0] ?? null;
}

/** Fetch a row by its materialized full `path` (the routing key for any depth). */
export async function getRowByPath(
  tableName: string,
  path: string,
  opts: { onlyPublished?: boolean } = {},
): Promise<ContentRow | null> {
  const t = ident(tableName);
  const pub = opts.onlyPublished ? sql` AND "status" = ${"published"}` : sql``;
  const rows = await db.all<ContentRow>(
    sql`SELECT * FROM ${t} WHERE "path" = ${path}${pub} LIMIT 1`,
  );
  return rows[0] ?? null;
}

/**
 * All rows whose materialized `path` is strictly UNDER `parentPath` (i.e. begins
 * with `parentPath + "/"`), at any depth. UNCAPPED — used by the rename cascade,
 * which must rewrite EVERY descendant's path or the subtree's URLs break; a
 * capped list-and-filter would silently miss descendants on a large type. The
 * prefix is matched with LIKE, so its LIKE metacharacters are escaped and an
 * explicit ESCAPE clause is set (path segments can legitimately contain `_`).
 */
export async function listDescendantRows(
  tableName: string,
  parentPath: string,
): Promise<ContentRow[]> {
  const t = ident(tableName);
  const like = parentPath.replace(/[\\%_]/g, "\\$&") + "/%";
  return db.all<ContentRow>(
    sql`SELECT * FROM ${t} WHERE "path" LIKE ${like} ESCAPE '\\' ORDER BY "path" ASC`,
  );
}

/** Insert a row. `values` keys must be real columns; identifiers are validated. */
export async function insertRow(tableName: string, values: ContentRow): Promise<void> {
  const t = ident(tableName);
  const entries = Object.entries(values);
  if (entries.length === 0) throw new Error("insertRow: no values");
  const cols = sql.join(
    entries.map(([k]) => ident(k)),
    sql`, `,
  );
  const vals = sql.join(
    entries.map(([, v]) => sql`${v}`),
    sql`, `,
  );
  await db.run(sql`INSERT INTO ${t} (${cols}) VALUES (${vals})`);
}

/** Update a row by id with the given column/value pairs. */
export async function updateRow(
  tableName: string,
  id: string,
  values: ContentRow,
): Promise<void> {
  const t = ident(tableName);
  const entries = Object.entries(values);
  if (entries.length === 0) return;
  const assignments = sql.join(
    entries.map(([k, v]) => sql`${ident(k)} = ${v}`),
    sql`, `,
  );
  await db.run(sql`UPDATE ${t} SET ${assignments} WHERE "id" = ${id}`);
}

/** Delete a row by id. */
export async function deleteRow(tableName: string, id: string): Promise<void> {
  const t = ident(tableName);
  await db.run(sql`DELETE FROM ${t} WHERE "id" = ${id}`);
}

/**
 * Published rows for sitemap paging: just the URL `path` and `updated_at`, one
 * page at a time. Ordered by `"id" ASC` so the offset windows are stable across
 * requests (sitemap chunking depends on a deterministic page boundary).
 * Uncapped — the caller supplies limit/offset (a sitemap chunk is up to 50k).
 */
export async function listPublishedRowsForSitemap(
  tableName: string,
  opts: { limit: number; offset: number },
): Promise<Array<{ path: string; updated_at: number | null }>> {
  const t = ident(tableName);
  const rows = await db.all<{ path: string; updated_at: number | null }>(
    sql`SELECT "path", "updated_at" FROM ${t} WHERE "status" = ${"published"} ORDER BY "id" ASC LIMIT ${opts.limit} OFFSET ${opts.offset}`,
  );
  return rows;
}

/** How many published rows a content type has (for sitemap chunk math). */
export async function countPublishedRows(tableName: string): Promise<number> {
  const t = ident(tableName);
  const rows = await db.all<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM ${t} WHERE "status" = ${"published"}`,
  );
  return Number(rows[0]?.n ?? 0);
}
