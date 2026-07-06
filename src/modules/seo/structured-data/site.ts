import type { SiteContext } from "../jsonld";

/**
 * Site-level structured data — emitted ONCE per site (in the public layout),
 * not per page. `Organization` establishes the publisher identity; `WebSite`
 * declares the site and its search action so engines can offer a sitelinks
 * search box.
 */

const clean = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== "")) as T;

/** Optional identity extras, sourced from settings (Phase 4/7 fills these in). */
export type OrganizationExtras = {
  /** Absolute or site-relative logo URL. */
  logoUrl?: string | null;
  /** Social / canonical profile URLs for `sameAs`. */
  sameAs?: string[];
};

/** schema.org Organization — the site's publisher identity. */
export function organization(ctx: SiteContext, extras: OrganizationExtras = {}) {
  const sameAs = (extras.sameAs ?? []).filter((u) => !!u);
  return clean({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ctx.siteName,
    url: ctx.siteUrl,
    logo: extras.logoUrl || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  });
}

/**
 * schema.org WebSite with a SearchAction pointing at the on-site search route
 * (`/search?q=`). The `{search_term_string}` placeholder is the schema.org
 * convention Google reads for the sitelinks search box.
 */
export function webSite(ctx: SiteContext) {
  const base = ctx.siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ctx.siteName,
    url: ctx.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
