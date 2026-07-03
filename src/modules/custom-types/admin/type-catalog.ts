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
};

export const CORE_TYPES: CatalogType[] = [
  { key: "page", label: "Pages", fields: "Title, route, template, SEO, block tree", canDisable: false },
  { key: "post", label: "Posts", fields: "Title, slug, excerpt, tags, block tree", canDisable: false },
  { key: "product", label: "Products", fields: "Name, price, SKU, inventory, variants, images, collections", canDisable: true },
  { key: "collection", label: "Collections", fields: "Name, description, cover, visibility, SEO", canDisable: true },
];

export const STRUCTURED_TYPES: CatalogType[] = [
  { key: "project", label: "Projects", fields: "Title, tagline, year, live/GitHub URL, tags, blocks", canDisable: true },
  { key: "guide", label: "Guides", fields: "Title, summary, category, difficulty, effort, cost, steps", canDisable: true },
  { key: "resource", label: "Resources", fields: "Title, URL, type, source, platforms, is_public", canDisable: true },
];
