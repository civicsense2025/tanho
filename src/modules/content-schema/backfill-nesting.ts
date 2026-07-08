import { and, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawRun } from "@/lib/db/raw";
import { customTypes } from "@/modules/custom-types/schema";
import { assertIdentifier } from "./identifiers";
import { tableColumns } from "./introspect";

/**
 * One-time data migration that brings EXISTING `ct_*` content-type tables up to
 * the nesting spine (`parent_id` + `path`). Static Drizzle migrations can't do
 * this because ct_ table names are dynamic (created at runtime per type), so it
 * runs here — idempotent, so it's safe to invoke on every deploy/boot and a
 * no-op once applied (and a no-op on a fresh install with no content types).
 *
 * Per table, when `path` is absent:
 *   1. ALTER ADD parent_id (nullable) + path (NOT NULL DEFAULT '').
 *   2. Backfill path = "{basePath}/{slug}" for every row (so existing content
 *      resolves identically to before — these are all top-level rows today).
 *   3. Add a UNIQUE index on path, and swap the legacy UNIQUE(slug) index for a
 *      plain (non-unique) slug index. Uniqueness must move from slug to path or
 *      the table can never hold the same leaf slug under two parents — i.e.
 *      nesting would be blocked on every migrated table (see ddl.ts).
 *
 * Newly-created ct_ tables already include the spine (see ddl.ts spineClauses),
 * so this only touches tables that predate the nesting feature.
 */
export async function backfillNestingSpine(): Promise<{ altered: string[]; skipped: string[] }> {
  const altered: string[] = [];
  const skipped: string[] = [];

  // Every table-backed type, regardless of publish status — drafts have ct_
  // tables too. (listPublishedTypes filters to status='published', not enough.)
  const rows = await db
    .select({ tableName: customTypes.tableName, basePath: customTypes.basePath })
    .from(customTypes)
    .where(and(isNotNull(customTypes.tableName), isNotNull(customTypes.basePath)));

  for (const row of rows) {
    if (!row.tableName || !row.basePath) continue;
    const table = assertIdentifier(row.tableName);
    const t = sql.identifier(table);
    const cols = await tableColumns(table);
    if (cols.includes("path")) {
      skipped.push(table);
      continue;
    }

    const base = row.basePath.replace(/\/+$/, ""); // e.g. "/recipes"

    // 1. Add the two spine columns (parent_id may already exist from a partial run).
    if (!cols.includes("parent_id")) {
      await rawRun(sql`ALTER TABLE ${t} ADD COLUMN "parent_id" text`);
    }
    await rawRun(sql`ALTER TABLE ${t} ADD COLUMN "path" text NOT NULL DEFAULT ''`);

    // 2. Backfill path = base + "/" + slug. `base` is a bound parameter; the
    //    slug column is referenced by its (fixed) name.
    await rawRun(sql`UPDATE ${t} SET "path" = ${base} || '/' || "slug"`);

    // 3. Move uniqueness from slug → path. Add the unique path index, drop the
    //    legacy UNIQUE(slug) (which would otherwise forbid same-slug siblings
    //    under different parents), and add a plain slug index for by-slug reads.
    await rawRun(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS ${sql.identifier(`${table}_path_unique`)} ON ${t} ("path")`,
    );
    await rawRun(sql`DROP INDEX IF EXISTS ${sql.identifier(`${table}_slug_unique`)}`);
    await rawRun(
      sql`CREATE INDEX IF NOT EXISTS ${sql.identifier(`${table}_slug_idx`)} ON ${t} ("slug")`,
    );

    altered.push(table);
  }

  return { altered, skipped };
}
