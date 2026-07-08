import type { EntryRow } from "./schema";
import {
  getPublishedEntry,
  getPublishedEntryBlocks,
  listPublishedEntries,
} from "./queries";
import type { GuideData } from "@/entities/schemas/guide";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";

/** Which content type a public entity route base belongs to. */
export const ROUTE_TYPE: Record<string, string> = { guides: "guide" };

/**
 * Discriminated union describing what a public site-relative route resolves to.
 * The catch-all route renders the matching template, or calls notFound() on null.
 *
 * Projects and Resources were moved to data-backed ct_* tables and are now
 * resolved by the content-type router (resolveContentTypeRoute). Only the
 * guides hierarchy (hubs directory → hub list → guide detail) remains here,
 * because its category-field-based routing doesn't map to the ct_* path system.
 */
export type EntityRoute =
  | { kind: "hubs-directory"; hubs: EntryRow[]; countsByHub: Record<string, number> }
  | { kind: "hub-list"; hub: EntryRow; guides: EntryRow[] }
  | { kind: "guide-detail"; entry: EntryRow; hub: EntryRow };

/**
 * Resolve a site-relative route ("/guides", "/guides/hub", "/guides/hub/slug")
 * to the entity content it should render, or null so the catch-all falls
 * through to the next resolver.
 *
 * Server-only: reads the cached public query layer directly. Never leaks
 * unpublished entries.
 */
export async function resolveEntityRoute(route: string): Promise<EntityRoute | null> {
  const segments = route.split("/").filter(Boolean);

  // A content type turned off in Settings → Content types is hidden from the
  // public site — its routes 404 (and it's dropped from the sitemap).
  const baseType = ROUTE_TYPE[segments[0] ?? ""];
  if (baseType) {
    const contentTypes = await getContentTypesSettings();
    if (isTypeDisabled(contentTypes, baseType)) return null;
  }

  // /guides, /guides/:hub, /guides/:hub/:slug
  if (segments[0] === "guides") {
    if (segments.length === 1) {
      const hubs = await listPublishedEntries("hub");
      const guides = await listPublishedEntries("guide");
      const countsByHub: Record<string, number> = {};
      for (const hub of hubs) {
        countsByHub[hub.slug] = guides.filter(
          (g) => (g.data as GuideData).category === hub.slug,
        ).length;
      }
      return { kind: "hubs-directory", hubs, countsByHub };
    }

    if (segments.length === 2) {
      const hub = await getPublishedEntry("hub", segments[1]);
      if (!hub) return null;
      const guides = (await listPublishedEntries("guide")).filter(
        (g) => (g.data as GuideData).category === hub.slug,
      );
      return { kind: "hub-list", hub, guides };
    }

    if (segments.length === 3) {
      const hub = await getPublishedEntry("hub", segments[1]);
      if (!hub) return null;
      const entry = await getPublishedEntry("guide", segments[2]);
      if (!entry || (entry.data as GuideData).category !== hub.slug) return null;
      return { kind: "guide-detail", entry, hub };
    }

    return null;
  }

  return null;
}

// Re-exported for templates that need to fetch a guide's published block tree.
export { getPublishedEntryBlocks };
