import { cacheLife, cacheTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customTypes, type CustomTypeRow } from "@/modules/custom-types/schema";
import { getRowByPath, getRowBySlug, listRows, type ContentRow } from "./crud";

/** A table-backed content type — one that has a physical `ct_*` table. */
export type TableBackedType = CustomTypeRow & { tableName: string; basePath: string };

function isTableBacked(row: CustomTypeRow | undefined | null): row is TableBackedType {
  return !!row && !!row.tableName && !!row.basePath;
}

/**
 * A PUBLISHED, table-backed, route-owning content type by its base path
 * (e.g. "/products"). Cached; the tag is busted when a type is
 * saved/published (updateTag("custom_types")). Returns null for legacy
 * JSON-backed types, drafts, or a base that no type owns.
 */
export async function getPublishedTypeByBase(basePath: string): Promise<TableBackedType | null> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types", `content-type:${basePath}`);
  const row = await db.query.customTypes.findFirst({
    where: and(eq(customTypes.basePath, basePath), eq(customTypes.status, "published")),
  });
  return isTableBacked(row) ? row : null;
}

/** All rows of a published content type, for its index page (cached). */
export async function listPublishedTypeRows(type: TableBackedType): Promise<ContentRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types", `content-type-rows:${type.id}`);
  return listRows(type.tableName, { onlyPublished: true });
}

/** One published row of a content type by its slug, for a detail page (cached). */
export async function getPublishedTypeRow(
  type: TableBackedType,
  rowSlug: string,
): Promise<ContentRow | null> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types", `content-type-rows:${type.id}`);
  return getRowBySlug(type.tableName, rowSlug, { onlyPublished: true });
}

/** A published row by its full materialized path — resolves items at any depth. */
export async function getPublishedTypeRowByPath(
  type: TableBackedType,
  path: string,
): Promise<ContentRow | null> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types", `content-type-rows:${type.id}`);
  return getRowByPath(type.tableName, path, { onlyPublished: true });
}

/** Every published, table-backed, route-owning type — for sitemap enumeration. */
export async function listPublishedTypes(): Promise<TableBackedType[]> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types");
  const rows = await db.query.customTypes.findMany({ where: eq(customTypes.status, "published") });
  return rows.filter(isTableBacked);
}
