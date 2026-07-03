import * as schema from "@/lib/db/schema";
import type { TableName } from "./manifest";

/**
 * TableName → the Drizzle table object, so export/import can do
 * `db.select().from(TABLES[name])` generically instead of a giant switch.
 * Keys must exactly match the exported schema symbol names (see
 * lib/db/schema/index.ts re-exports) — this file is the one place a
 * mismatch would surface, at the TypeScript level.
 */
export const TABLES = {
  settings: schema.settings,
  theme: schema.theme,
  themePresets: schema.themePresets,
  pages: schema.pages,
  blockSets: schema.blockSets,
  entries: schema.entries,
  collections: schema.collections,
  products: schema.products,
  productVariants: schema.productVariants,
  productCollections: schema.productCollections,
  menus: schema.menus,
  forms: schema.forms,
  policies: schema.policies,
  redirects: schema.redirects,
  profile: schema.profile,
  customTypes: schema.customTypes,
  tags: schema.tags,
  taggings: schema.taggings,
  media: schema.media,
  shippingZones: schema.shippingZones,
  people: schema.people,
  personActivity: schema.personActivity,
  memberships: schema.memberships,
  emailSubscriptions: schema.emailSubscriptions,
} satisfies Record<TableName, unknown>;
