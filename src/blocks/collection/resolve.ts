import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customTypes } from "@/modules/custom-types/schema";
import { listPublishedEntries } from "@/modules/entries/queries";
import { listPublishedTypeRows, type TableBackedType } from "@/modules/content-schema/queries";
import type { CollectionContent } from "./fields";

/** One flattened record, uniform across sources. `_href`, `title`, `slug` are the
 * reserved keys the item template can always bind to; everything else is the
 * record's own fields spread at top level so `{{record.<field>}}` is source-agnostic. */
export type CollectionRecord = Record<string, unknown> & {
  title?: string;
  slug?: string;
  _href?: string;
};

/**
 * Server-only: resolve a collection's bound records (never rendered rows — the
 * item template renders each). Returns `[]` (never throws) for a mis-bound or
 * draft source, so the block shows its empty state rather than crashing. One
 * cached query per source (not per row).
 */
export async function resolveCollection(content: CollectionContent): Promise<CollectionRecord[]> {
  const { source, limit } = content;

  if (source.kind === "entries") {
    const rows = await listPublishedEntries(source.entity);
    return rows.slice(0, limit).map((r) => ({
      ...(r.data as Record<string, unknown>),
      title: r.title,
      slug: r.slug,
      _href: `/${source.entity}/${r.slug}`,
    }));
  }

  // customType: resolve the table-backed type by slug or base path, then its rows.
  const key = source.type.trim();
  if (!key) return [];
  const base = key.startsWith("/") ? key : `/${key}`;
  const typeRow = await db.query.customTypes.findFirst({
    where: and(
      eq(customTypes.status, "published"),
      or(eq(customTypes.slug, key), eq(customTypes.basePath, base)),
    ),
  });
  if (!typeRow || !typeRow.tableName || !typeRow.basePath) return [];
  const type = typeRow as TableBackedType;
  const slugCol = type.slugField ?? "slug";
  const titleCol = type.titleField ?? "title";

  const rows = await listPublishedTypeRows(type);
  return rows.slice(0, limit).map((r) => ({
    ...r,
    title: String(r[titleCol] ?? ""),
    slug: String(r[slugCol] ?? ""),
    _href: `${type.basePath}/${String(r[slugCol] ?? "")}`,
  }));
}
