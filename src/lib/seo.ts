import type { Metadata } from "next";

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
}

/** Fallback chain: seoTitle -> title, seoDescription -> tagline, ogImage ->
 * coverImage. Shared by every generateMetadata() call site so the fallback
 * logic lives in one place. */
export function buildMetadata(fields: SeoFields, fallbacks: SeoFallbacks): Metadata {
  const title = fields.seoTitle || fallbacks.title;
  const description = fields.seoDescription || fallbacks.tagline || undefined;
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
 * template resolution (future generateMetadata() call sites) and the client-side live SERP
 * preview in SeoFields.tsx, so the substitution logic lives in exactly one place. */
export function resolveTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => vars[key] || "");
}
