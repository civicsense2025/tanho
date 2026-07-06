import { mediaPublicUrl } from "@/modules/fonts/queries";
import { getSeoSettings } from "../queries";

/** Base path of the dynamic OG-image Route Handler (see
 *  src/app/api/og/route.tsx). Relative — resolved against `metadataBase` by
 *  Next, so it always lands on the canonical host. A per-page/default UPLOADED
 *  image (an absolute CDN URL) takes precedence over this generated fallback. */
export const DYNAMIC_OG_PATH = "/api/og";

/** One resolved Open Graph image entry, ready for Next's `openGraph.images`. */
export type OgImage = { url: string; width?: number; height?: number; alt?: string };

/** Standard OG card dimensions (also what the dynamic route renders at). */
export const OG_DIMENSIONS = { width: 1200, height: 630 } as const;

/** Build the dynamic OG-image URL for a page, encoding the title/tag it should
 *  render. Kept short (the route also clamps) so the URL stays well under
 *  crawler length limits. */
export function dynamicOgUrl(title?: string, tag?: string): string {
  const qs = new URLSearchParams();
  if (title) qs.set("title", title.slice(0, 120));
  if (tag) qs.set("tag", tag.slice(0, 40));
  const query = qs.toString();
  return query ? `${DYNAMIC_OG_PATH}?${query}` : DYNAMIC_OG_PATH;
}

/**
 * Resolve the share image for a page, in priority order:
 *   1. an explicit `directUrl` (e.g. a product's own image, already a URL),
 *   2. the page's own `ogImageMediaId` (uploaded),
 *   3. the site-wide `seo.defaultOgMediaId` (uploaded),
 *   4. the dynamic branded OG route (generated per page, from title/tag).
 *
 * Uploaded media resolve to absolute CDN URLs via `mediaPublicUrl`; the
 * generated fallback is a relative path (see `dynamicOgUrl`). Returns a
 * single-element array for spreading into `openGraph.images` / `twitter.images`.
 */
export async function resolveOgImage(
  pageOgMediaId?: string | null,
  directUrl?: string | null,
  fallbackCard?: { title?: string; tag?: string },
): Promise<OgImage[]> {
  if (directUrl) return [{ url: directUrl, ...OG_DIMENSIONS }];
  const uploadedId = pageOgMediaId || (await getSeoSettings()).defaultOgMediaId;
  if (uploadedId) {
    const url = await mediaPublicUrl(uploadedId);
    if (url) return [{ url, ...OG_DIMENSIONS }];
  }
  return [{ url: dynamicOgUrl(fallbackCard?.title, fallbackCard?.tag), ...OG_DIMENSIONS }];
}
