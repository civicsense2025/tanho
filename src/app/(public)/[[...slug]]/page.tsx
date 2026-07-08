import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { record404 } from "@/modules/seo/audit/tracking";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { CUSTOM_SCOPE_CLASS, sanitizeCss } from "@/lib/css-sanitizer";
import { pageLayout, type PageLayoutSettings } from "@/blocks/layout";
import { layoutForTemplate } from "@/modules/pages/public/page-template";
import { getPublishedPage } from "@/modules/pages/queries";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getViewer } from "@/modules/people/viewer";
import { getSeoSettings } from "@/modules/seo/queries";
import { article } from "@/modules/seo/jsonld";
import { JsonLd } from "@/modules/seo/JsonLdScript";
import { buildPageMetadata } from "@/modules/seo/metadata/build";
import { resolveEntityRoute } from "@/modules/entries/router";
import { EntityRouteView, entityMetaVars } from "@/modules/entries/public/EntityRouteView";
import { resolveContentTypeRoute } from "@/modules/content-pages/router";
import {
  ContentTypeRouteView,
  contentTypeMetaVars,
} from "@/modules/content-pages/public/ContentTypeRouteView";
import { resolveShopRoute } from "@/modules/commerce/public/router";
import { ShopRouteView } from "@/modules/commerce/public/ShopRouteView";
import { resolveCodePage } from "@/app/(public)/code-pages/registry";

type Params = { slug?: string[] };
type Search = Record<string, string | string[] | undefined>;

const routeOf = (slug?: string[]) =>
  "/" + (slug ?? []).map((s) => encodeURIComponent(s)).join("/");

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const { slug } = await params;
  const route = routeOf(slug);

  // Every branch normalizes its route into a PageDescriptor and delegates to
  // buildPageMetadata — the single place title/description/OG/twitter/canonical/
  // robots are assembled. No hand-rolled Metadata objects here.
  const page = await getPublishedPage(route);
  if (page) {
    return buildPageMetadata({
      contentType: page.page.kind === "post" ? "post" : "page",
      title: page.page.seoTitle || page.page.title,
      excerpt: page.page.seoDescription || undefined,
      path: page.page.route,
      canonicalOverride: page.page.canonicalUrl || undefined,
      ogImageMediaId: page.page.ogImageMediaId,
      noIndex: page.page.noIndex,
      kind: page.page.kind === "post" ? "article" : "website",
    });
  }

  const codePage = resolveCodePage(route);
  if (codePage) {
    return buildPageMetadata({
      contentType: "page",
      title: codePage.title,
      excerpt: codePage.description,
      path: route,
    });
  }

  const entity = await resolveEntityRoute(route);
  if (entity) {
    const { type, vars } = entityMetaVars(entity);
    return buildPageMetadata({
      contentType: type,
      title: vars.title,
      excerpt: vars.excerpt,
      tag: vars.tag,
      path: route,
      kind: type === "guide" ? "article" : "website",
    });
  }

  const contentRoute = await resolveContentTypeRoute(route);
  if (contentRoute) {
    const { title, description } = contentTypeMetaVars(contentRoute);
    return buildPageMetadata({
      contentType: "page",
      title,
      excerpt: description || undefined,
      path: route,
    });
  }

  // Shop routes previously had NO generateMetadata — they inherited only the
  // root defaults (no canonical, no per-product OG). Resolve the shop route and
  // give the index + product pages real metadata.
  const sp = await searchParams;
  const shop = await resolveShopRoute(route, toSearchParams(sp));
  if (shop?.kind === "product-detail") {
    const p = shop.product;
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const desc = p.seo?.description || stripHtml(p.description).slice(0, 200) || undefined;
    return buildPageMetadata({
      contentType: "page",
      title: p.seo?.title || p.name,
      excerpt: desc,
      path: `/shop/${p.slug}`,
      // Product images are already public URLs; the first is the share image.
      ogImageUrl: p.images?.[0] ?? null,
      kind: "website",
    });
  }
  if (shop?.kind === "shop-index") {
    return buildPageMetadata({ contentType: "page", title: "Shop", path: route });
  }
  if (shop?.kind === "shop-success") {
    // The order-confirmation page must never be indexed.
    return buildPageMetadata({ contentType: "page", title: "Order confirmed", path: route, noIndex: true });
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

  // Note: user redirect rules are resolved earlier, in the proxy (src/proxy.ts),
  // so a matching rule never reaches this page. This route only handles live
  // content + the 404 fallback.

  const hit = await getPublishedPage(route);
  if (hit) {
    // The page's template seeds default layout settings; its explicit layout
    // overrides them field-by-field (one renderer, no template-specific fork).
    const merged = layoutForTemplate(hit.page.template, hit.page.layout as PageLayoutSettings);
    const L = pageLayout(merged, "desktop");
    // Only gated pages read the viewer cookie — keeps un-gated pages static.
    const viewer = hit.page.hasPaywall ? await getViewer() : null;
    // Article JSON-LD for posts only.
    let articleLd: ReturnType<typeof article> | undefined;
    if (hit.page.kind === "post") {
      const [general, seo] = await Promise.all([getGeneralSettings(), getSeoSettings()]);
      const siteName = general.name;
      const siteUrl = seo.siteUrl || process.env.APP_URL || "http://localhost:3000";
      articleLd = article(
        {
          title: hit.page.seoTitle || hit.page.title,
          summary: hit.page.seoDescription || undefined,
          url: hit.page.route,
        },
        { siteName, siteUrl },
      );
    }
    // Per-page custom code. customCss is RE-sanitised here (defence in depth — also
    // sanitised on save) and scoped to this page's .pb-custom-scope root. The head/body
    // HTML is OWNER-AUTHORED and rendered VERBATIM (the save action gates it to role
    // "owner"); it's the one deliberately-unsanitised surface, injected raw so real
    // analytics/pixel <script>s run.
    const pageCss = hit.page.customCss ? sanitizeCss(hit.page.customCss) : "";
    const headHtml = hit.page.customHeadHtml ?? "";
    const bodyHtml = hit.page.customBodyHtml ?? "";
    return (
      <main
        id="top"
        className={CUSTOM_SCOPE_CLASS}
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
        {articleLd ? <JsonLd schema={articleLd} /> : null}
        {pageCss ? <style data-page-css="">{pageCss}</style> : null}
        {headHtml ? <div data-page-head-code="" dangerouslySetInnerHTML={{ __html: headHtml }} /> : null}
        <RenderBlocks blocks={hit.blocks} viewer={viewer} />
        {bodyHtml ? <div data-page-body-code="" dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
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

  const contentRoute = await resolveContentTypeRoute(route);
  if (contentRoute) return <ContentTypeRouteView route={contentRoute} />;

  const sp = await searchParams;
  const shop = await resolveShopRoute(route, toSearchParams(sp));
  if (shop) return <ShopRouteView route={shop} />;

  // Log the miss for the SEO audit's broken-link report (deduped, never throws),
  // then render the 404. headers() is only read on this cold path.
  const referrer = (await headers()).get("referer") ?? "";
  await record404(route, referrer);
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
