import { getRowById } from "./crud";

/** The type fields path resolution needs — a structural subset of the type row,
 *  so both the full TableBackedType and the narrower row-action type fit. */
export type PathContext = {
  tableName: string;
  basePath: string | null;
  permalinkPattern: string;
  isHierarchical: boolean;
};

/**
 * Compute a content row's materialized full `path` from its content type's
 * permalink pattern, its slug, and (for nested rows) its parent's already-
 * resolved path. `path` is the single routing key — the catch-all resolver
 * matches it directly, so it must be computed on every create and whenever the
 * slug or parent changes (cascading to descendants).
 *
 * Placeholders in `permalinkPattern`:
 *   {base}         → the type's basePath (e.g. "/recipes"), leading slash kept
 *   {slug}         → this row's slug
 *   {parent_path}  → the parent row's path WITHOUT the {base} prefix, or "" at
 *                    the top level. So a child of "/recipes/desserts" with slug
 *                    "cake" and pattern "{base}/{parent_path}/{slug}" resolves to
 *                    "/recipes/desserts/cake". Doubled/trailing slashes collapse.
 */
export function resolvePathTemplate(
  pattern: string,
  base: string,
  slug: string,
  parentPath: string,
): string {
  const baseClean = base.replace(/\/+$/, ""); // "/recipes"
  // parent_path is the parent's path minus the base prefix + leading slash.
  const parentRel = parentPath.startsWith(baseClean)
    ? parentPath.slice(baseClean.length).replace(/^\/+/, "")
    : parentPath.replace(/^\/+/, "");
  const raw = (pattern || "{base}/{slug}")
    .replaceAll("{base}", baseClean)
    .replaceAll("{parent_path}", parentRel)
    .replaceAll("{slug}", slug);
  // Collapse any doubled slashes (empty parent_path leaves "//") and trailing.
  const collapsed = raw.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

/**
 * Resolve a row's path, loading the parent row's path when the row nests.
 * `parentId` null / non-hierarchical type → a top-level path (parent_path = "").
 */
export async function computeRowPath(
  type: PathContext,
  slug: string,
  parentId: string | null,
): Promise<string> {
  let parentPath = "";
  if (type.isHierarchical && parentId) {
    const parent = await getRowById(type.tableName, parentId);
    parentPath = parent && typeof parent.path === "string" ? parent.path : "";
  }
  return resolvePathTemplate(type.permalinkPattern, type.basePath ?? "", slug, parentPath);
}
