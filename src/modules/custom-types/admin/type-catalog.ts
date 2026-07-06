/**
 * The content-type catalog for the Content Types screen, split the way the
 * design does it:
 *  - CORE_TYPES ("Built in"): Pages + Posts (true core, always on) and
 *    Products + Collections (ship with the commerce module — part of the
 *    platform).
 *  - STRUCTURED_TYPES ("Custom"): Projects, Guides, Resources. These are
 *    structured content types this site ships with, but from the owner's point
 *    of view they're custom — so they sit under Custom, alongside any
 *    fully-owner-defined types.
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
   *  page). Lets every built-in/structured row link through to its real
   *  management screen, so the page isn't a dead end. */
  manageHref: string;
};

export const CORE_TYPES: CatalogType[] = [
  { key: "page", label: "Pages", fields: "Title, route, template, SEO, block tree", canDisable: false, manageHref: "/admin/pages" },
  { key: "post", label: "Posts", fields: "Title, slug, excerpt, tags, block tree", canDisable: false, manageHref: "/admin/pages" },
  { key: "product", label: "Products", fields: "Name, price, SKU, inventory, variants, images, collections", canDisable: true, manageHref: "/admin/shop/products" },
  { key: "collection", label: "Collections", fields: "Name, description, cover, visibility, SEO", canDisable: true, manageHref: "/admin/shop/collections" },
];

export const STRUCTURED_TYPES: CatalogType[] = [
  { key: "project", label: "Projects", fields: "Title, tagline, year, live/GitHub URL, tags, blocks", canDisable: true, manageHref: "/admin/content/projects" },
  { key: "guide", label: "Guides", fields: "Title, summary, category, difficulty, effort, cost, steps", canDisable: true, manageHref: "/admin/content/guides" },
  { key: "resource", label: "Resources", fields: "Title, URL, type, source, platforms, is_public", canDisable: true, manageHref: "/admin/content/resources" },
];
