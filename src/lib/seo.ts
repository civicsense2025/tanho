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
