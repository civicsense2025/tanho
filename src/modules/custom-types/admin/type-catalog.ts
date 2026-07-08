/**
 * The content-type catalog for the Content Types screen.
 *  - CORE_TYPES ("Built in"): Pages + Posts (true core, always on) and
 *    Products + Collections (ship with the commerce module — part of the
 *    platform). These live on dedicated tables with specialized behaviour
 *    (SEO, Stripe, custom code) and are managed through their own admin
 *    screens.
 *
 * Data-backed types (Projects, Guides, Resources, and any owner-created or
 * imported types) are NOT in this catalog — they're loaded from the
 * `custom_types` table at runtime and rendered as DataTypeCards. This catalog
 * only covers the fixed built-in types that can't be created or deleted.
 *
 * Each carries a display label + a fields summary. `canDisable` is false for
 * the two core types the site can't run without.
 */
export type CatalogType = {
  key: string;
  label: string;
  fields: string;
  canDisable: boolean;
  /** Where this type's RECORDS are managed (records live outside this registry
   *  page). Lets every built-in row link through to its real management
   *  screen, so the page isn't a dead end. */
  manageHref: string;
};

export const CORE_TYPES: CatalogType[] = [
  { key: "page", label: "Pages", fields: "Title, route, template, SEO, block tree", canDisable: false, manageHref: "/admin" },
  { key: "post", label: "Posts", fields: "Title, slug, excerpt, tags, block tree", canDisable: false, manageHref: "/admin" },
  { key: "product", label: "Products", fields: "Name, price, SKU, inventory, variants, images, collections", canDisable: true, manageHref: "/admin/shop/products" },
  { key: "collection", label: "Collections", fields: "Name, description, cover, visibility, SEO", canDisable: true, manageHref: "/admin/shop/collections" },
];
