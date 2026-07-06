import type { Metadata } from "next";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "../queries";
import { buildMeta } from "../jsonld";
import { resolveOgImage } from "./og-image";

/**
 * A normalized description of a page, from which `buildPageMetadata` produces a
 * complete Next `Metadata`. Every public `generateMetadata` builds one of these
 * and delegates — so title/description/OG/twitter/robots/canonical are computed
 * in ONE place instead of hand-rolled per route.
 *
 * `path` is the page's own route (relative, e.g. `/work/foo`); it becomes the
 * canonical URL and `og:url`, resolved to an absolute URL by the root layout's
 * `metadataBase`. `contentType` selects the title/description template
 * (page/post/project/guide/resource, or `custom:<slug>`), falling back to
 * `page` for anything unrecognized — see `buildMeta`.
 */
export type PageDescriptor = {
  contentType: string;
  /** Raw title token for the template (usually the page/entry title). */
  title?: string;
  /** Raw excerpt/summary token for the description template. */
  excerpt?: string;
  /** Optional tag token (e.g. a category or first tag). */
  tag?: string;
  /** The page's own route, used for canonical + og:url. */
  path: string;
  /** Explicit canonical override; wins over `path` when set. */
  canonicalOverride?: string;
  /** Per-page uploaded OG image; falls back to site default then generated. */
  ogImageMediaId?: string | null;
  /** An already-resolved OG image URL (e.g. a product image). Wins over all
   *  media-id resolution when set. */
  ogImageUrl?: string | null;
  /** noindex this page (in addition to the site-wide indexable gate). */
  noIndex?: boolean;
  /** article vs website — drives og:type and article:* tags. */
  kind?: "article" | "website";
  /** ISO timestamps for articles. */
  publishedTime?: string;
  modifiedTime?: string;
  /** Author names for article:author. */
  authors?: string[];
};

/** Map a settings language code (e.g. "en", "en-GB") to an OG locale ("en_US"). */
function ogLocale(language: string): string {
  const [lang, region] = language.replace("_", "-").split("-");
  if (region) return `${lang}_${region.toUpperCase()}`;
  // Bare language → a sensible default region so crawlers get a full locale.
  const DEFAULT_REGION: Record<string, string> = { en: "US", fr: "FR", es: "ES", de: "DE", pt: "BR" };
  return DEFAULT_REGION[lang] ? `${lang}_${DEFAULT_REGION[lang]}` : lang;
}

/**
 * The single source of truth for a page's `Metadata`. Resolves the templated
 * title/description, canonical, robots, and the full Open Graph + Twitter card
 * (including the share image). Absolute-URL fields stay relative here and are
 * anchored by the root layout's `metadataBase` — do NOT hardcode the origin.
 */
export async function buildPageMetadata(desc: PageDescriptor): Promise<Metadata> {
  const [general, seo] = await Promise.all([getGeneralSettings(), getSeoSettings()]);

  const { title, description } = buildMeta(
    desc.contentType,
    { title: desc.title, excerpt: desc.excerpt, tag: desc.tag },
    seo,
    general.name,
  );
  const desc0 = description || general.tagline || undefined;
  const canonical = desc.canonicalOverride || desc.path;
  // The generated-card fallback renders the human title (with the site name
  // stripped back off if the template added it) + optional tag.
  const images = await resolveOgImage(desc.ogImageMediaId, desc.ogImageUrl, {
    title: desc.title || general.name,
    tag: desc.tag,
  });
  const noindex = desc.noIndex || !general.indexable;
  const isArticle = desc.kind === "article";

  return {
    // `buildMeta` already composed the site name into the title via the
    // content-type template, so mark it absolute — otherwise the root layout's
    // `title.template` (`%s · {site}`) would append the site name a second time.
    title: { absolute: title },
    description: desc0,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description: desc0,
      url: canonical,
      siteName: general.name,
      locale: ogLocale(general.language),
      type: isArticle ? "article" : "website",
      images,
      ...(isArticle
        ? {
            publishedTime: desc.publishedTime,
            modifiedTime: desc.modifiedTime,
            authors: desc.authors,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc0,
      images,
    },
  };
}
