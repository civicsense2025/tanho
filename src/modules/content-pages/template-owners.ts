/**
 * Pure, dependency-free helpers for content-type template ownership — kept out
 * of queries.ts (which imports `next/cache`, server-only) so BOTH the public
 * renderer (server) and the admin template editor (client component) can import
 * these without dragging cache APIs into a client bundle.
 *
 * Owner-designed templates live in `block_sets` under a dedicated namespace so
 * they never collide with each row's own `entry:*` tree:
 *   - `type-template:index:<slug>`  — the index (listing) page template
 *   - `type-template:detail:<slug>` — the per-row detail page template
 */
export type TypeTemplateKind = "index" | "detail";

export function typeTemplateOwner(kind: TypeTemplateKind, slug: string): string {
  return `type-template:${kind}:${slug}`;
}

/**
 * Owner key for ONE custom-type row's OWN block tree (its bespoke detail layout),
 * stored per row (ownerId = the row's id) — distinct from the shared
 * `type-template:detail:<slug>`. A row that has its own published tree renders it in
 * preference to the shared template (see ContentTypeDetail). Mirrors the `entry:<type>`
 * namespace projects/guides already use, namespaced by the custom type's slug.
 */
export function rowBlocksOwner(slug: string): string {
  return `entry:custom:${slug}`;
}
