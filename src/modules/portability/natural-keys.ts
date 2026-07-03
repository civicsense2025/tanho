import type { TableName } from "./manifest";

/**
 * How import.ts matches an incoming row to an existing one for upsert.
 * "id" means the row's own `id` column is treated as stable across
 * export/import (true for a re-import into the SAME site; for moving
 * content to a DIFFERENT site with its own generated ids, an id-keyed table
 * will insert a duplicate rather than merge — see the id-keyed tables below).
 *
 * Composite keys list every column that together form the natural key.
 */
export type NaturalKey = { kind: "column"; column: string } | { kind: "composite"; columns: string[] };

/**
 * Registry of table → natural key. Every CORE_TABLES / PEOPLE_TABLES entry
 * must appear here — import.ts asserts on that at call time.
 *
 * IMPORTANT constraint discovered while smoke-testing against the dev DB:
 * SQLite's `ON CONFLICT (col)` only works when `col` has an actual UNIQUE
 * index or is the PRIMARY KEY — a column that merely functions as a natural
 * key in application logic isn't enough. Every key below was cross-checked
 * against each schema.ts for a real `.unique()` / `.primaryKey()` /
 * `uniqueIndex(...)` / composite `primaryKey([...])`.
 *
 * Ambiguous / schema-forced fallbacks (flagged per the build brief):
 *  - menus: the brief specified "name" as the natural key, but
 *    modules/menus/schema.ts does NOT put a unique constraint on `name` —
 *    only `id` is unique (PK). Upserting on "name" fails at the DB level
 *    ("ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE
 *    constraint"), confirmed by an end-to-end export→import smoke test.
 *    Falls back to "id", so re-importing into a DIFFERENT site (fresh ids)
 *    will insert duplicate menus of the same name rather than merge them.
 *  - productVariants, themePresets, forms, shippingZones, personActivity,
 *    memberships, emailSubscriptions: no unique natural-key column exists in
 *    the schema at all (sku/label/etc. can repeat). All fall back to "id",
 *    which is only stable on a re-import into the SAME site.
 *  - media: keyed by storageKey (the schema's own unique column), not id —
 *    this lines up with how files are restored (storage.put(key, ...)).
 *  - blockSets / productCollections / taggings: composite PKs already
 *    defined by the schema, used as-is.
 */
export const NATURAL_KEYS: Record<TableName, NaturalKey> = {
  settings: { kind: "column", column: "namespace" },
  theme: { kind: "column", column: "id" }, // singleton, id is always "theme"
  themePresets: { kind: "column", column: "id" }, // no unique constraint on name/data
  pages: { kind: "column", column: "slug" },
  blockSets: { kind: "composite", columns: ["ownerType", "ownerId", "variant"] },
  entries: { kind: "composite", columns: ["type", "slug"] },
  collections: { kind: "column", column: "slug" },
  products: { kind: "column", column: "slug" },
  productVariants: { kind: "column", column: "id" }, // ambiguous — see above
  productCollections: { kind: "composite", columns: ["productId", "collectionId"] },
  menus: { kind: "column", column: "id" }, // schema has no unique(name) — see above
  forms: { kind: "column", column: "id" }, // no unique name/slug on forms
  policies: { kind: "column", column: "slug" },
  redirects: { kind: "column", column: "fromPath" },
  profile: { kind: "column", column: "id" }, // singleton, id is always "profile"
  customTypes: { kind: "column", column: "slug" },
  tags: { kind: "column", column: "name" },
  taggings: { kind: "composite", columns: ["tagId", "ownerType", "ownerId"] },
  media: { kind: "column", column: "storageKey" },
  shippingZones: { kind: "column", column: "id" }, // no unique name constraint
  people: { kind: "column", column: "email" },
  personActivity: { kind: "column", column: "id" }, // append-only timeline, no natural key
  memberships: { kind: "column", column: "id" }, // no unique (personId, tier) constraint
  emailSubscriptions: { kind: "column", column: "id" }, // no unique (personId, list) constraint
};
