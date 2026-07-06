import {
  getPublishedTypeByBase,
  getPublishedTypeRowByPath,
  listPublishedTypeRows,
  type TableBackedType,
} from "@/modules/content-schema/queries";
import type { ContentRow } from "@/modules/content-schema/crud";

/**
 * What a site-relative route resolves to within the content-pages system:
 * a published content type's INDEX (`/{base}`) or a single row's DETAIL
 * (`/{base}/{rowSlug}`), or null so the catch-all falls through to the next
 * resolver (shop) / notFound.
 *
 * This is the DB-driven fallback that covers types the scaffolder hasn't
 * written real route files for yet (or never will) — the scaffolded files and
 * this resolver both delegate to the same ContentTypeIndex/ContentTypeDetail.
 */
export type ContentTypeRoute =
  | { kind: "content-index"; type: TableBackedType; rows: ContentRow[] }
  | { kind: "content-detail"; type: TableBackedType; row: ContentRow };

/**
 * Resolve a route to content-type content. Server-only: reads the cached
 * published query layer. Only ever surfaces published, table-backed,
 * route-owning types and their published rows.
 *
 * - `/{base}`                    → index (type + all published rows)
 * - `/{base}/…any depth…/{slug}` → detail (type + the row whose materialized
 *                                  `path` equals the route); null if no such row
 *
 * Nesting is UNBOUNDED: a detail is matched by the row's full stored `path`
 * (`/{base}/parent/child/leaf`), not by a fixed two-segment shape. The type
 * still owns the first segment.
 */
export async function resolveContentTypeRoute(route: string): Promise<ContentTypeRoute | null> {
  const segments = route.split("/").filter(Boolean);
  if (segments.length < 1) return null;

  const base = `/${segments[0]}`;
  const type = await getPublishedTypeByBase(base);
  if (!type) return null;

  // Bare base → the type's index.
  if (segments.length === 1) {
    const rows = await listPublishedTypeRows(type);
    return { kind: "content-index", type, rows };
  }

  // Anything deeper → a single row, looked up by its full path at any depth.
  const row = await getPublishedTypeRowByPath(type, route);
  if (!row) return null;
  return { kind: "content-detail", type, row };
}
