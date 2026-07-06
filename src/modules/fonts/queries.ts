import { cacheLife } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { storage } from "@/adapters/storage";
import { media } from "@/modules/media/schema";
import { fontFaces, fontFamilies } from "./schema";
import { buildFontFaceCss, cssStackFor, primaryPreloadUrl } from "./css";

/**
 * Everything the public renderer needs to apply the active custom font:
 * the `@font-face` CSS (only for the active family), the `--font-sans` stack,
 * and the primary face URL to preload. Returns nulls when no family is active
 * (the caller then falls back to the built-in `font` preset).
 */
export type ActiveFontRender = {
  fontFaceCss: string;
  cssStack: string | null;
  preloadUrl: string | null;
};

const EMPTY: ActiveFontRender = { fontFaceCss: "", cssStack: null, preloadUrl: null };

/** Resolve a media id → its public `/api/media/<key>` URL (or null). Loads
 *  only the exact rows needed (this runs on every public render). */
async function urlResolver(mediaIds: string[]): Promise<(id: string) => string | null> {
  if (mediaIds.length === 0) return () => null;
  const rows = await db.query.media.findMany({ where: inArray(media.id, mediaIds) });
  const keyById = new Map(rows.map((r) => [r.id, r.storageKey]));
  return (id: string) => {
    const key = keyById.get(id);
    return key ? storage.publicUrl(key) : null;
  };
}

export async function getActiveFontRender(
  fontFamilyId: string | null,
): Promise<ActiveFontRender> {
  if (!fontFamilyId) return EMPTY;

  const family = await db.query.fontFamilies.findFirst({
    where: eq(fontFamilies.id, fontFamilyId),
  });
  if (!family || family.status !== "active") return EMPTY;

  const faces = await db.query.fontFaces.findMany({
    where: eq(fontFaces.familyId, fontFamilyId),
  });
  if (faces.length === 0) return EMPTY;

  const urlFor = await urlResolver(faces.map((f) => f.mediaId));

  return {
    fontFaceCss: buildFontFaceCss([family], faces, urlFor),
    cssStack: cssStackFor(family.name),
    preloadUrl: primaryPreloadUrl(fontFamilyId, faces, urlFor),
  };
}

/** Resolve a media id → its public URL (single, for logo/favicon). Cached: a
 *  media id's storage key is immutable, and this is called up to 3x per public
 *  page (favicon in the layout, logo in the header + footer). */
export async function mediaPublicUrl(mediaId: string | null): Promise<string | null> {
  "use cache";
  cacheLife("max");
  if (!mediaId) return null;
  const row = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
  return row ? storage.publicUrl(row.storageKey) : null;
}
