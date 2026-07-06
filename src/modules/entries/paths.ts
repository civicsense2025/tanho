/**
 * The public path for a published entry, or null if the type has no per-item
 * detail page. Single source of truth shared by the sitemap and the
 * slug-change → 301 logic so the two can never drift on how an entry URL is
 * built. `data` supplies the guide category.
 */
export function entryPublicPath(
  type: string,
  slug: string,
  data: Record<string, unknown> = {},
): string | null {
  switch (type) {
    case "project":
      return `/work/${slug}`;
    case "guide": {
      const category = typeof data.category === "string" ? data.category : "general";
      return `/guides/${category}/${slug}`;
    }
    case "hub":
      return `/guides/${slug}`;
    default:
      return null;
  }
}
