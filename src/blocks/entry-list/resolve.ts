import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customTypes } from "@/modules/custom-types/schema";
import { listPublishedTypeRows } from "@/modules/content-schema/queries";
import type { TableBackedType } from "@/modules/content-schema/queries";
import type { EntryListContent } from "./fields";

/** One card in the list: a published row of the bound content type. */
export type EntryListItem = {
  href: string;
  title: string;
  /** A short secondary line — the first text-ish non-spine field's value, if any. */
  subtitle: string;
};

/**
 * Server-only: resolve the block's bound content type (by slug OR base path),
 * then its published rows mapped to card items linking to `{base}/{slugField}`.
 * Returns `[]` (never throws to the walker) when the binding names no
 * published, table-backed, route-owning type — so a mis-bound or draft type
 * renders as an empty list rather than a crash.
 */
export async function resolveEntryList(content: EntryListContent): Promise<EntryListItem[]> {
  const key = content.contentType.trim();
  if (!key) return [];

  // Accept either a slug ("products") or a base path ("/products"); a template
  // author binds by slug, but a base path is the more natural handle elsewhere.
  const base = key.startsWith("/") ? key : `/${key}`;
  const row = await db.query.customTypes.findFirst({
    where: and(
      eq(customTypes.status, "published"),
      or(eq(customTypes.slug, key), eq(customTypes.basePath, base)),
    ),
  });
  if (!row || !row.tableName || !row.basePath) return [];
  const type = row as TableBackedType;

  const rows = await listPublishedTypeRows(type);
  const titleCol = type.titleField ?? "title";
  const slugCol = type.slugField ?? "slug";
  // Pick the first owner field that is neither the title nor the slug as the
  // secondary line — a generic, no-config "show a bit more" for the default
  // and template card designs alike.
  const subtitleCol = type.fields
    .filter((f) => !f.hidden)
    .map((f) => f.key)
    .find((k) => k !== titleCol && k !== slugCol);

  return rows.slice(0, content.limit).map((r) => {
    const slug = String(r[slugCol] ?? "");
    const title = String(r[titleCol] ?? "") || slug;
    const subtitle = subtitleCol != null && r[subtitleCol] != null ? String(r[subtitleCol]) : "";
    return { href: `${type.basePath}/${slug}`, title, subtitle };
  });
}
