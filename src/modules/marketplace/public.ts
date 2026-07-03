import { notFound } from "next/navigation";
import { getMarketplaceSettings } from "./queries";
import type { EntryRow } from "@/modules/entries/schema";

/** URL path segment → entries.type. */
export const PACK_TYPE_BY_URL = {
  "block-pack": "block_pack",
  "design-pack": "design_pack",
} as const;

export type PackUrlType = keyof typeof PACK_TYPE_BY_URL;

export const PACK_URL_TYPES = Object.keys(PACK_TYPE_BY_URL) as PackUrlType[];

/** Inverse: entries.type → URL path segment. */
export function urlTypeForEntryType(type: string): PackUrlType | null {
  for (const [url, dbType] of Object.entries(PACK_TYPE_BY_URL)) {
    if (dbType === type) return url as PackUrlType;
  }
  return null;
}

/**
 * Marketplace public-access guard. Returns the settings when the marketplace is
 * enabled AND public; otherwise calls `notFound()` (for page routes). Use
 * `isMarketplacePublic()` for route handlers that must return a Response.
 */
export async function requireMarketplacePublic(): Promise<void> {
  const s = await getMarketplaceSettings();
  if (!s.enabled || s.visibility !== "public") notFound();
}

/** True when the marketplace is enabled and public (for route handlers). */
export async function isMarketplacePublic(): Promise<boolean> {
  const s = await getMarketplaceSettings();
  return s.enabled && s.visibility === "public";
}

/** Pack metadata read from an entry row's `data` JSON. */
export type PackMeta = {
  type: PackUrlType;
  slug: string;
  title: string;
  description: string;
  source: string;
  requiredBlockTypes: string[];
};

const metaFrom = (row: EntryRow): PackMeta => {
  const data = (row.data ?? {}) as {
    description?: string;
    source?: string;
    requiredTypes?: string[];
  };
  const urlType = urlTypeForEntryType(row.type);
  return {
    type: urlType ?? "block-pack",
    slug: row.slug,
    title: row.title,
    description: data.description ?? "",
    source: data.source ?? "local",
    requiredBlockTypes: data.requiredTypes ?? [],
  };
};

/** Build the catalog list from published block_pack + design_pack entries. */
export async function buildPackMetaList(
  blockPacks: EntryRow[],
  designPacks: EntryRow[],
): Promise<PackMeta[]> {
  return [...blockPacks, ...designPacks].map(metaFrom);
}
