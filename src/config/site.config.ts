/**
 * Single source of instance identity for the template. Everything that makes one
 * deployment "this site" rather than "the template" is resolved here from environment
 * variables, with the original author's values as the built-in defaults so an unconfigured
 * checkout renders identically to before this layer existed.
 *
 * White-labeling contract: a new instance sets NEXT_PUBLIC_SITE_* env vars (and optional
 * feature flags) — it never edits code. Client-exposed fields use the NEXT_PUBLIC_ prefix so
 * they're inlined at build time and available in the browser; server-only concerns stay off
 * this object. The export is frozen so no code path can mutate shared identity at runtime.
 *
 * SECURITY: values here are owner-controlled build-time config, not end-user input. They still
 * flow only through escaping sinks — React auto-escapes text nodes/metadata, and JsonLd
 * (src/components/JsonLd.tsx) escapes </>/& before dangerouslySetInnerHTML — so a stray angle
 * bracket in a brand name can never break out into markup. Do not string-concatenate these
 * into raw HTML.
 */

/** Feature toggles. Off-by-default flags gate optional, additive modules (payments, AI,
 * newsletter) so the base template — and this author's portfolio — ships without them and
 * pays no code-path cost until an instance opts in. */
export interface SiteFeatures {
  /** Reader-facing payments module (their Stripe): subscriptions, tips, paid posts. */
  payments: boolean;
  /** AI-assisted authoring in the CMS/wizard. When off, no AI code paths or keys are needed. */
  ai: boolean;
  /** Migration guides + resources section. On by default (present in the base template). */
  guides: boolean;
  /** Newsletter primitives: posts/issues, subscribers, RSS. */
  newsletter: boolean;
  /** Blocks named AI-training/scraping crawlers (see src/lib/ai-crawlers.ts) via robots.txt
   * disallow rules and a proxy-level 403. Off by default -- unlike the scaffolding flags above,
   * this is a behavior-changing choice some site owners want and others don't. */
  blockAiCrawlers: boolean;
}

/** How the instance is built and served. `dynamic` uses the runtime DB adapters; `static`
 * targets an SSG/file-content export with no runtime database. Consumed by build/content
 * wiring in later phases; declared here so the choice has one canonical home. */
export type SiteMode = "static" | "dynamic";

/** Default color mode. `system` follows the OS (the historical behavior); `light`/`dark` force
 * a mode. Maps to <html data-theme> in layout.tsx. */
export type ThemeMode = "light" | "dark" | "system";

/** Per-instance theme overrides. Empty/undefined = the built-in design tokens. Colors/font/
 * radius map onto the existing semantic token layer via ThemeStyle, so a white-label re-skins
 * the whole app from env with no code edits. */
export interface ThemeConfig {
  defaultMode: ThemeMode;
  /** Hex override for --accent (primary). */
  accent?: string;
  /** Hex override for --accent-2 (secondary). */
  accent2?: string;
  /** Sans-serif font stack override for --font-sans. */
  font?: string;
}

/** Third-party site-verification meta tags and analytics IDs. All optional/off-by-default --
 * unset means the corresponding <meta>/script simply isn't rendered, so an unconfigured
 * checkout has no tracking and nothing to verify. */
export interface SiteAnalytics {
  /** Google Search Console HTML-tag verification token (the content= value only, not the
   * whole <meta> tag). From GSC property setup -> "HTML tag" method. */
  googleSiteVerification?: string;
  /** GA4 Measurement ID, e.g. "G-XXXXXXXXXX". Loads gtag.js when set. */
  gaMeasurementId?: string;
}

export interface SiteConfig {
  /** Short brand/person name, e.g. used in JSON-LD author and SEO title suffixes. */
  siteName: string;
  /** Full <title> / og:title for the site-wide default. */
  title: string;
  /** Site-wide meta description / og:description default. */
  description: string;
  /** Author name for Person/author JSON-LD across projects, guides, and the homepage. */
  author: string;
  /** Optional one-line positioning statement (currently informational; surfaced in later UI). */
  tagline: string;
  /** BCP-47 locale for <html lang> and future i18n. */
  locale: string;
  /** Absolute origin (no trailing slash). Mirrors seo.ts SITE_URL; kept here so the whole
   * identity is readable from one object. Normalized to strip any trailing slash. */
  url: string;
  features: SiteFeatures;
  mode: SiteMode;
  theme: ThemeConfig;
  analytics: SiteAnalytics;
}

/** Parses a boolean env flag. Only the exact strings "true"/"1" (case-insensitive) enable;
 * anything else — including unset — falls back to `fallback`. Defensive against typos silently
 * enabling a module. */
export function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

const DEFAULT_TITLE = "Tan Ho — Product Designer & Digital Marketer";
const DEFAULT_DESCRIPTION =
  "I'm a Forbes 30 Under 30 product designer and front-end developer. I co-founded Fiveable, scaled it to 15M+ students, and secured $15M in funding. I build products at the intersection of design, growth, and engineering.";

const rawMode = process.env.NEXT_PUBLIC_SITE_MODE;
const mode: SiteMode = rawMode === "static" ? "static" : "dynamic";

const rawThemeMode = process.env.NEXT_PUBLIC_THEME_MODE;
// Default "system" preserves the historical auto-dark behavior (prefers-color-scheme).
const themeMode: ThemeMode =
  rawThemeMode === "light" || rawThemeMode === "dark" ? rawThemeMode : "system";

export const siteConfig: SiteConfig = Object.freeze({
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Tan Ho",
  title: process.env.NEXT_PUBLIC_SITE_TITLE || DEFAULT_TITLE,
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || DEFAULT_DESCRIPTION,
  author: process.env.NEXT_PUBLIC_SITE_AUTHOR || "Tan Ho",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || "",
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE || "en",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  features: {
    payments: envFlag(process.env.NEXT_PUBLIC_FEATURE_PAYMENTS, false),
    ai: envFlag(process.env.NEXT_PUBLIC_FEATURE_AI, false),
    guides: envFlag(process.env.NEXT_PUBLIC_FEATURE_GUIDES, true),
    newsletter: envFlag(process.env.NEXT_PUBLIC_FEATURE_NEWSLETTER, false),
    blockAiCrawlers: envFlag(process.env.NEXT_PUBLIC_FEATURE_BLOCK_AI_CRAWLERS, false),
  },
  mode,
  theme: {
    defaultMode: themeMode,
    accent: process.env.NEXT_PUBLIC_THEME_ACCENT || undefined,
    accent2: process.env.NEXT_PUBLIC_THEME_ACCENT_2 || undefined,
    font: process.env.NEXT_PUBLIC_THEME_FONT || undefined,
  },
  analytics: {
    googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined,
  },
});
