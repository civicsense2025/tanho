import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { getRedirect } from "@/modules/redirects/queries";
import { isSameOriginPath } from "@/modules/redirects/validation";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { pageLayout, type PageLayoutSettings } from "@/blocks/layout";
import { layoutForTemplate } from "@/modules/pages/public/page-template";
import { getPublishedPage } from "@/modules/pages/queries";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getViewer } from "@/modules/people/viewer";
import { getSeoSettings } from "@/modules/seo/queries";
import { buildMeta } from "@/modules/seo/jsonld";
import { resolveEntityRoute } from "@/modules/entries/router";
import { EntityRouteView, entityMetaVars } from "@/modules/entries/public/EntityRouteView";
import { resolveShopRoute } from "@/modules/commerce/public/router";
import { ShopRouteView } from "@/modules/commerce/public/ShopRouteView";
import { resolveCodePage } from "@/app/(public)/code-pages/registry";

type Params = { slug?: string[] };
type Search = Record<string, string | string[] | undefined>;

const routeOf = (slug?: string[]) =>
  "/" + (slug ?? []).map((s) => encodeURIComponent(s)).join("/");

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const route = routeOf(slug);
  const general = await getGeneralSettings();
  const robotsOff = { index: false, follow: false } as const;

  const page = await getPublishedPage(route);
  if (page) {
    return {
      title: page.page.seoTitle || page.page.title,
      description: page.page.seoDescription || general.tagline || undefined,
      alternates: page.page.canonicalUrl ? { canonical: page.page.canonicalUrl } : undefined,
      robots: page.page.noIndex || !general.indexable ? robotsOff : undefined,
    };
  }

  const codePage = resolveCodePage(route);
  if (codePage) {
    return {
      title: codePage.title,
      description: codePage.description,
      robots: general.indexable ? undefined : robotsOff,
    };
  }

  const entity = await resolveEntityRoute(route);
  if (entity) {
    const seo = await getSeoSettings();
    const { type, vars } = entityMetaVars(entity);
    const meta = buildMeta(type, vars, seo, general.name);
    return {
      title: meta.title,
      description: meta.description || undefined,
      robots: general.indexable ? undefined : robotsOff,
    };
  }
  return {};
}

/**
 * Every public URL resolves here: try a CMS page first, then the code-page
 * registry (see code-pages/registry.tsx), then the entity routes
 * (/work, /guides, /resources), then shop routes, then 404. Routing is
 * otherwise entirely database-driven — no hardcoded paths.
 */
export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const route = routeOf(slug);

  // STEP 1: redirects. A matching rule short-circuits before any page lookup.
  // Re-check same-origin at redirect time (defence in depth against an
  // open-redirect even if a bad row reached the table).
  const rule = await getRedirect(route);
  if (rule && isSameOriginPath(rule.toPath)) {
    if (rule.code === 302) redirect(rule.toPath);
    permanentRedirect(rule.toPath);
  }

  const hit = await getPublishedPage(route);
  if (hit) {
    // The page's template seeds default layout settings; its explicit layout
    // overrides them field-by-field (one renderer, no template-specific fork).
    const merged = layoutForTemplate(hit.page.template, hit.page.layout as PageLayoutSettings);
    const L = pageLayout(merged, "desktop");
    // Only gated pages read the viewer cookie — keeps un-gated pages static.
    const viewer = hit.page.hasPaywall ? await getViewer() : null;
    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          gap: L.gap,
          maxWidth: L.maxWidth,
          marginInline: "auto",
          padding: `${L.padY} ${L.gutter}`,
          ["--pb-gutter" as never]: L.gutter,
        }}
      >
        <RenderBlocks blocks={hit.blocks} viewer={viewer} />
      </main>
    );
  }

  const codePage = resolveCodePage(route);
  if (codePage) {
    const { Component } = codePage;
    return <Component />;
  }

  const entity = await resolveEntityRoute(route);
  if (entity) return <EntityRouteView route={entity} />;

  const sp = await searchParams;
  const shop = await resolveShopRoute(route, toSearchParams(sp));
  if (shop) return <ShopRouteView route={shop} />;

  notFound();
}

/** Flatten Next's searchParams object into a URLSearchParams for the router. */
function toSearchParams(sp: Search): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") out.set(key, value);
    else if (Array.isArray(value) && value[0] != null) out.set(key, value[0]);
  }
  return out;
}
