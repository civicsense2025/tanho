import type { EntryRow } from "./schema";
import {
  getPublishedEntry,
  getPublishedEntryBlocks,
  listPublishedEntries,
} from "./queries";
import type { ResourceData } from "@/entities/schemas/resource";
import type { GuideData } from "@/entities/schemas/guide";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";

/** Which content type a public entity route base belongs to. */
const ROUTE_TYPE: Record<string, string> = { work: "project", guides: "guide", resources: "resource" };

/**
 * Discriminated union describing what a public site-relative route resolves to.
 * The catch-all route renders the matching template, or calls notFound() on null.
 */
export type EntityRoute =
  | { kind: "project-detail"; entry: EntryRow }
  | { kind: "hubs-directory"; hubs: EntryRow[]; countsByHub: Record<string, number> }
  | { kind: "hub-list"; hub: EntryRow; guides: EntryRow[] }
  | { kind: "guide-detail"; entry: EntryRow; hub: EntryRow }
  | { kind: "resources-index"; resources: EntryRow[] };

/**
 * Resolve a site-relative route ("/work/foo", "/guides", "/guides/hub/slug",
 * "/resources") to the entity content it should render, or null so the
 * catch-all falls through to notFound().
 *
 * Server-only: reads the cached public query layer directly. Never leaks
 * unpublished entries, and for resources only ever surfaces is_public rows.
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

  // /work/:slug — published project detail.
  if (segments[0] === "work") {
    if (segments.length !== 2) return null;
    const entry = await getPublishedEntry("project", segments[1]);
    return entry ? { kind: "project-detail", entry } : null;
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

  // /resources — published AND is_public resources only.
  if (segments[0] === "resources") {
    if (segments.length !== 1) return null;
    const resources = (await listPublishedEntries("resource")).filter(
      (r) => (r.data as ResourceData).is_public === true,
    );
    return { kind: "resources-index", resources };
  }

  return null;
}

// Re-exported for templates that need to fetch a guide's published block tree.
export { getPublishedEntryBlocks };
