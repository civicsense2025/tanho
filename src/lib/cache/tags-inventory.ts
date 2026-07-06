/**
 * Every STATIC (non-templated) `cacheTag()` string used by a `"use cache"`
 * function across the app. Exists so a bulk operation that needs to
 * invalidate "everything cacheable" (e.g. a primary-database cutover) has a
 * real, exhaustive list to call `updateTag()` against, instead of guessing.
 *
 * Deliberately excludes per-entity tags built from a runtime id/slug (e.g.
 * `entries:${type}`, `page:${pageId}`, `policy:${slug}`,
 * `content-type-rows:${type.id}`) — those tags only ever get READ once a
 * matching row exists, so after a fresh provision (no rows yet) there is no
 * stale cache entry to invalidate for them: the first read of a brand-new
 * entity's page always misses cold, by construction. Only the static/global
 * tags below can hold a stale cross-database-switch entry.
 *
 * Keep this in sync by hand — a CI check (see
 * `tags-inventory.test.ts`) greps every `cacheTag(` call site and fails if a
 * static string literal isn't present here, so drift is caught rather than
 * silently missed.
 */
export const STATIC_CACHE_TAGS: readonly string[] = [
  "block-registry",
  "settings:payments",
  "products",
  "storefront",
  "settings:ecommerce",
  "settings:general",
  "custom_types",
  "entries",
  "settings:ai_crawlers",
  "settings:content_types",
  "settings:donations",
  "marketplace",
  "federated-catalog",
  "policies",
  "theme",
  "redirects",
  "profile",
  "settings:membership",
  "theme-presets",
  "chrome:chrome:header",
  "chrome:chrome:footer",
  "settings:people",
  "menus",
  "settings:seo",
  "pages",
  "settings:onboarding",
  "settings:domain",
  "settings:analytics",
];
