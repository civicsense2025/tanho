import { listPublishedEntries } from "@/modules/entries/queries";
import { get as getBuiltinEntitySchema } from "@/entities/registry";
import type { RelatedContentContent } from "./fields";

/** One resolved related item — everything the pure Render needs. */
export type RelatedItem = {
  title: string;
  subtitle: string;
  href: string;
};

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Resolve the related-content list server-side. Lists published entries of the
 * configured type (cached + tagged by `listPublishedEntries`), optionally
 * filters by a tag, orders (recent first when `by` = recent), caps to `limit`,
 * and maps each to a public URL from its entity `basePath`.
 *
 * Note: tags are stored inside each entry's JSON `data`, which isn't indexed —
 * this is an O(n) scan of the type's published entries. Fine at CMS scale; the
 * `limit` cap keeps the output bounded.
 */
export async function resolveRelatedContent(
  content: RelatedContentContent,
): Promise<RelatedItem[]> {
  // Built-in entity types only (project/guide/resource/…). Custom types
  // (custom:<slug>) resolve their basePath from a DB-backed registry that
  // pulls server-only code; related-content targets the built-ins for now.
  const schema = getBuiltinEntitySchema(content.type);
  if (!schema || schema.taxonomy) return [];
  const base = schema.basePath.replace(/\/$/, "");

  let rows = await listPublishedEntries(content.type);

  if (content.by === "tag" && content.tag.trim()) {
    const want = content.tag.trim().toLowerCase();
    rows = rows.filter((r) => {
      const data = (r.data ?? {}) as Record<string, unknown>;
      return asStringArray(data.tags).some((t) => t.toLowerCase() === want);
    });
  }

  // "recent" ≈ most recently updated first; listPublishedEntries returns
  // sort-order/title order, so re-sort by updatedAt for the recent strategy.
  if (content.by === "recent") {
    rows = [...rows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  return rows.slice(0, content.limit).map((r) => {
    const data = (r.data ?? {}) as Record<string, unknown>;
    const subtitle = typeof data.tagline === "string" ? data.tagline : "";
    return { title: r.title, subtitle, href: `${base}/${r.slug}` };
  });
}
