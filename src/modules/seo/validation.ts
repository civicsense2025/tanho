import { z } from "zod";

/**
 * The content types that carry their own SEO metadata template. Built-in
 * pages/posts plus the structured entity types. Custom types fall back to
 * the `page` template.
 */
export const SEO_CONTENT_TYPES = ["page", "post", "project", "guide", "resource"] as const;
export type SeoContentType = (typeof SEO_CONTENT_TYPES)[number];

/** One metadata template — title/description with {title} {excerpt} {tag} {site} tokens. */
const templateSchema = z.object({
  title: z.string().max(200).default("{title} · {site}"),
  description: z.string().max(400).default("{excerpt}"),
});

export type SeoTemplate = z.infer<typeof templateSchema>;

const DEFAULT_TEMPLATES: Record<SeoContentType, SeoTemplate> = {
  page: { title: "{title} · {site}", description: "{excerpt}" },
  post: { title: "{title} — {site}", description: "{excerpt}" },
  project: { title: "{title} — {tag} · {site}", description: "{excerpt}" },
  guide: { title: "{title} · Guides · {site}", description: "{excerpt}" },
  resource: { title: "{title} · {site}", description: "{excerpt}" },
};

/**
 * A search-engine verification token. Providers issue an opaque alphanumeric
 * string (dashes/underscores allowed); anything else is rejected so a value
 * echoed into a `<meta content>` can't carry markup or quotes.
 */
const verificationToken = z
  .string()
  .max(200)
  .regex(/^[A-Za-z0-9_-]*$/, "Only letters, numbers, - and _")
  .default("");

/** Site verification codes, mapped into <meta> tags by the root layout. */
const verificationSchema = z.object({
  google: verificationToken,
  bing: verificationToken,
  pinterest: verificationToken,
  yandex: verificationToken,
});

export type SeoVerification = z.infer<typeof verificationSchema>;

/** All-empty verification set — the default before any code is entered. */
const VERIFICATION_DEFAULT: SeoVerification = verificationSchema.parse({});

/**
 * The `seo` settings namespace. `siteUrl` is the canonical origin used for
 * absolute URLs in the sitemap and JSON-LD; empty falls back to APP_URL.
 */
export const seoSettingsSchema = z.object({
  siteUrl: z
    .string()
    .max(400)
    .regex(/^$|^https:\/\/\S+$/, "Must be an https:// URL or empty")
    .default(""),
  defaultOgMediaId: z.string().nullable().default(null),
  sitemapEnabled: z.boolean().default(true),
  templates: z
    .record(z.enum(SEO_CONTENT_TYPES), templateSchema)
    .default(DEFAULT_TEMPLATES),
  /** Search-engine ownership verification tokens (Search Console, Bing, etc.). */
  verification: verificationSchema.default(VERIFICATION_DEFAULT),
  /** Public social/profile URLs — surfaced as Organization `sameAs`. Restricted
   *  to http(s) so a javascript:/data: URL can never reach the rendered output. */
  socialProfiles: z
    .array(z.string().url().max(400).refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) URL"))
    .max(20)
    .default([]),
});

export type SeoSettings = z.infer<typeof seoSettingsSchema>;

export const SEO_DEFAULTS: SeoSettings = seoSettingsSchema.parse({});
