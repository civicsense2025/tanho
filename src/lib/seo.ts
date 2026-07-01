import type { Metadata } from "next";
import type { SeoTemplate } from "./db/types";

/** Absolute origin (no trailing slash) used to build canonical URLs, sitemap.xml, robots.txt,
 * and JSON-LD. Falls back to localhost so local dev/build doesn't crash when unset. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Builds an absolute URL for `path` (must start with "/") off SITE_URL. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Normalizes an image URL to absolute: already-absolute http(s) URLs (e.g. an external image
 * host) pass through unchanged, relative URLs (e.g. `/uploads/<uuid>.ext` from the local-fs
 * upload route) are resolved against SITE_URL. Required for openGraph.images and JSON-LD
 * `image` fields, which per spec/Rich Results validation must be absolute -- mirrors the
 * canonicalUrl normalization below. Returns undefined unchanged so callers can keep using
 * `image ? absoluteImage(image) : undefined`-style optional chaining. */
export function absoluteImage(image: string): string {
  return image.startsWith("http") ? image : absoluteUrl(image);
}

interface SeoFields {
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: number;
}

interface SeoFallbacks {
  title: string;
  tagline?: string | null;
  coverImage?: string | null;
  /** This entity's own public route (e.g. `/projects/my-slug`), used to build the default
   * absolute canonical URL when no canonicalUrl override is set. Optional so callers that
   * don't care about canonical tags (none currently) aren't forced to pass one. */
  path?: string;
  /** Extra {{variable}} values (beyond title/tagline) referenced by this entity type's
   * template, e.g. { summary } for guides/resources. Merged with title/tagline when
   * resolving `template` below. */
  vars?: Record<string, string | null | undefined>;
}

/** Fallback chain: seoTitle -> resolved titleTemplate (if `template` given) -> title, same
 * for description -> tagline, ogImage -> coverImage. `template` is optional so callers with
 * no seo_templates row (or that haven't fetched one) still get the old title/tagline-only
 * fallback. Shared by every generateMetadata() call site so the fallback logic lives in one
 * place. Canonical: fields.canonicalUrl (made absolute if relative) -> absolute URL built
 * from fallbacks.path -> unset. */
export function buildMetadata(fields: SeoFields, fallbacks: SeoFallbacks, template?: SeoTemplate): Metadata {
  const vars = { title: fallbacks.title, tagline: fallbacks.tagline, ...fallbacks.vars };
  const templateTitle = template?.titleTemplate ? resolveTemplate(template.titleTemplate, vars) : "";
  const templateDescription = template?.descriptionTemplate ? resolveTemplate(template.descriptionTemplate, vars) : "";

  const title = fields.seoTitle || templateTitle || fallbacks.title;
  const description = fields.seoDescription || templateDescription || fallbacks.tagline || undefined;
  const rawImage = fields.ogImage || fallbacks.coverImage || undefined;
  const image = rawImage ? absoluteImage(rawImage) : undefined;

  const metadata: Metadata = {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined },
  };

  const canonical = fields.canonicalUrl
    ? fields.canonicalUrl.startsWith("http")
      ? fields.canonicalUrl
      : absoluteUrl(fields.canonicalUrl)
    : fallbacks.path
      ? absoluteUrl(fallbacks.path)
      : undefined;
  if (canonical) metadata.alternates = { canonical };
  if (fields.noIndex) metadata.robots = { index: false, follow: false };

  return metadata;
}

/** Substitutes {{variable}} placeholders in a title/description template with values from `vars`.
 * Unknown/missing variables resolve to an empty string rather than being left as literal
 * "{{...}}" in admin-facing previews or rendered metadata. Shared by both the server-side
 * template resolution (generateMetadata() call sites, via buildMetadata() above) and the
 * client-side live SERP preview in SeoFields.tsx, so the substitution logic lives in exactly
 * one place. */
export function resolveTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => vars[key] || "");
}
