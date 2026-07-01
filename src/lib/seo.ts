import type { Metadata } from "next";
import type { SeoTemplate } from "./db/types";

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
  /** Extra {{variable}} values (beyond title/tagline) referenced by this entity type's
   * template, e.g. { summary } for guides/resources. Merged with title/tagline when
   * resolving `template` below. */
  vars?: Record<string, string | null | undefined>;
}

/** Fallback chain: seoTitle -> resolved titleTemplate (if `template` given) -> title, same
 * for description -> tagline, ogImage -> coverImage. `template` is optional so callers with
 * no seo_templates row (or that haven't fetched one) still get the old title/tagline-only
 * fallback. Shared by every generateMetadata() call site so the fallback logic lives in one
 * place. */
export function buildMetadata(fields: SeoFields, fallbacks: SeoFallbacks, template?: SeoTemplate): Metadata {
  const vars = { title: fallbacks.title, tagline: fallbacks.tagline, ...fallbacks.vars };
  const templateTitle = template?.titleTemplate ? resolveTemplate(template.titleTemplate, vars) : "";
  const templateDescription = template?.descriptionTemplate ? resolveTemplate(template.descriptionTemplate, vars) : "";

  const title = fields.seoTitle || templateTitle || fallbacks.title;
  const description = fields.seoDescription || templateDescription || fallbacks.tagline || undefined;
  const image = fields.ogImage || fallbacks.coverImage || undefined;

  const metadata: Metadata = {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined },
  };

  if (fields.canonicalUrl) metadata.alternates = { canonical: fields.canonicalUrl };
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
