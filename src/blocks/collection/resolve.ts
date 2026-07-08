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

/** Filter → sort → offset → limit, in that order, on the uniform flat-record
 *  shape. Pure JS over the already-fetched rows (no DB calls) — row counts are
 *  bounded by what the source returns; pushing filter/sort into the query is a
 *  future optimization for large sources. Exported for unit testing. */
export function applyCollectionQuery(
  records: CollectionRecord[],
  opts: {
    filterField?: string;
    filterValue?: string;
    orderBy?: string;
    orderDir: "asc" | "desc";
    offset: number;
    limit: number;
  },
): CollectionRecord[] {
  let out = records;

  // Filter: case-insensitive contains on the field's stringified value. A set
  // field with an empty value matches everything (no filter applies).
  if (opts.filterField && opts.filterValue) {
    const field = opts.filterField;
    const needle = opts.filterValue.toLowerCase();
    out = out.filter((r) => String(r[field] ?? "").toLowerCase().includes(needle));
  }

  // Sort: numeric when both values are numbers, else localeCompare. Nullish
  // values sort to the END regardless of direction; orderDir flips asc/desc.
  if (opts.orderBy) {
    const field = opts.orderBy;
    const dir = opts.orderDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      const aNil = av == null;
      const bNil = bv == null;
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  return out.slice(opts.offset, opts.offset + opts.limit);
}

/**
 * Server-only: resolve a collection's bound records (never rendered rows — the
 * item template renders each). Returns `[]` (never throws) for a mis-bound or
 * draft source, so the block shows its empty state rather than crashing. One
 * cached query per source (not per row), then the list-query knobs above.
 */
export async function resolveCollection(content: CollectionContent): Promise<CollectionRecord[]> {
  const { source, limit, offset, orderBy, orderDir, filterField, filterValue } = content;

  let records: CollectionRecord[];
  if (source.kind === "entries") {
    const rows = await listPublishedEntries(source.entity);
    records = rows.map((r) => ({
      ...(r.data as Record<string, unknown>),
      title: r.title,
      slug: r.slug,
      _href: `/${source.entity}/${r.slug}`,
    }));
  } else {
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
    records = rows.map((r) => ({
      ...r,
      title: String(r[titleCol] ?? ""),
      slug: String(r[slugCol] ?? ""),
      _href: `${type.basePath}/${String(r[slugCol] ?? "")}`,
    }));
  }

  return applyCollectionQuery(records, { filterField, filterValue, orderBy, orderDir, offset, limit });
}
