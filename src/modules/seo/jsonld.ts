import { applyTemplate } from "./templating";
import {
  SEO_CONTENT_TYPES,
  type SeoContentType,
  type SeoSettings,
} from "./validation";

/** Site identity threaded into every builder — never hardcoded. */
export type SiteContext = { siteName: string; siteUrl: string };

const abs = (siteUrl: string, path: string): string =>
  path.startsWith("http") ? path : `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const clean = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== "")) as T;

/** BreadcrumbList from an ordered list of {name, path}. */
export function breadcrumb(
  crumbs: Array<{ name: string; path: string }>,
  ctx: SiteContext,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(ctx.siteUrl, c.path),
    })),
  };
}

/** Article — posts and long-form content. */
export function article(
  input: { title: string; summary?: string; url: string; authorName?: string },
  ctx: SiteContext,
) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.summary,
    url: abs(ctx.siteUrl, input.url),
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : undefined,
    publisher: { "@type": "Organization", name: ctx.siteName },
  });
}

/** Person — the profile / about page. */
export function person(
  input: { name: string; bio?: string; url: string; avatarUrl?: string },
  ctx: SiteContext,
) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    description: input.bio,
    url: abs(ctx.siteUrl, input.url),
    image: input.avatarUrl ? abs(ctx.siteUrl, input.avatarUrl) : undefined,
  });
}

/** CreativeWork — a project / portfolio piece. */
export function creativeWork(
  input: {
    title: string;
    tagline?: string;
    year?: number | string;
    url: string;
    tags?: string[];
  },
  ctx: SiteContext,
) {
  return clean({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.title,
    description: input.tagline,
    dateCreated: input.year ? String(input.year) : undefined,
    url: abs(ctx.siteUrl, input.url),
    keywords: input.tags?.length ? input.tags.join(", ") : undefined,
    author: { "@type": "Organization", name: ctx.siteName },
  });
}

/**
 * Resolve a content type's title/description template. Custom types (and
 * anything unrecognized) fall back to the `page` template.
 */
export function buildMeta(
  type: string,
  vars: { title?: string; excerpt?: string; tag?: string },
  seoSettings: SeoSettings,
  siteName: string,
): { title: string; description: string } {
  const key: SeoContentType = (SEO_CONTENT_TYPES as readonly string[]).includes(type)
    ? (type as SeoContentType)
    : "page";
  const tmpl = seoSettings.templates?.[key] ?? { title: "{title} · {site}", description: "{excerpt}" };
  const tokens = { ...vars, site: siteName };
  return {
    title: applyTemplate(tmpl.title, tokens),
    description: applyTemplate(tmpl.description, tokens),
  };
}
