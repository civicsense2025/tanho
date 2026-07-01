import { cache } from "react";
import { listSiteSettings } from "@/lib/db";
import type { SiteSetting } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import {
  envFlag,
  type SiteAnalytics,
  type SiteConfig,
  type SiteFeatures,
  type ThemeConfig,
  type ThemeMode,
} from "@/config/site.config";

/** Non-secret settings, editable at /admin/settings. Each maps 1:1 to a site_settings row key;
 * absence of a row falls back to the same env var (legacy) or hardcoded default site.config.ts
 * always used, so an unconfigured/pre-migration DB renders identically to before this layer
 * existed. */
const DEFAULT_TITLE = "Tan Ho — Product Designer & Digital Marketer";
const DEFAULT_DESCRIPTION =
  "I'm a Forbes 30 Under 30 product designer and front-end developer. I co-founded Fiveable, scaled it to 15M+ students, and secured $15M in funding. I build products at the intersection of design, growth, and engineering.";

export interface SiteIntegrations {
  githubToken?: string;
  githubRepo?: string;
  githubBranch?: string;
  vercelDeployHookUrl?: string;
  emailProvider?: string;
  emailFrom?: string;
  resendApiKey?: string;
  postmarkServerToken?: string;
}

export interface ResolvedSettings extends SiteConfig {
  integrations: SiteIntegrations;
}

/** Keys stored encrypted (src/lib/crypto.ts) -- never sent to the browser in plaintext. See
 * src/app/api/settings/route.ts, which masks these in the GET response. */
export const SECRET_SETTING_KEYS = new Set([
  "integrations.githubToken",
  "integrations.vercelDeployHookUrl",
  "integrations.resendApiKey",
  "integrations.postmarkServerToken",
]);

/** Shape sent to/rendered by the /admin/settings UI -- decrypted secret values never appear
 * here, only whether one is currently set (hasValue), so the browser never receives plaintext
 * for a secret key once it's been saved. Shared by src/app/api/settings/route.ts (GET) and
 * src/app/admin/settings/page.tsx so the row-shaping logic lives in one place. */
export interface SettingRow {
  key: string;
  value: string | null;
  isSecret: boolean;
  hasValue: boolean;
  updatedAt: string;
}

export function toSettingRow(r: SiteSetting): SettingRow {
  return {
    key: r.key,
    value: r.isSecret ? null : r.value,
    isSecret: !!r.isSecret,
    hasValue: r.value !== null && r.value !== "",
    updatedAt: r.updatedAt,
  };
}

function readValue(map: Map<string, { value: string | null; isSecret: number }>, key: string): string | undefined {
  const row = map.get(key);
  if (!row || row.value === null || row.value === "") return undefined;
  if (row.isSecret) {
    try {
      return decryptSecret(row.value);
    } catch {
      // Tampered/undecryptable value -- treat as unset rather than throwing and taking the
      // whole site down over one bad row.
      return undefined;
    }
  }
  return row.value;
}

/** The DB-backed replacement for the old synchronous siteConfig singleton. Falls back to
 * process.env (legacy, pre-migration deployments) and then hardcoded defaults, in that order,
 * so nothing breaks for a deployment that hasn't touched /admin/settings yet. Wrapped in
 * React's cache() so every consumer in a given request (layout.tsx, generateMetadata, page
 * body, etc.) shares one site_settings read. */
export const getSettings = cache(async (): Promise<ResolvedSettings> => {
  const rows = await listSiteSettings();
  const map = new Map(rows.map((r) => [r.key, { value: r.value, isSecret: r.isSecret }]));
  const get = (key: string) => readValue(map, key);

  const rawThemeMode = get("theme.defaultMode") || process.env.NEXT_PUBLIC_THEME_MODE;
  const themeMode: ThemeMode = rawThemeMode === "light" || rawThemeMode === "dark" ? rawThemeMode : "system";

  const features: SiteFeatures = {
    payments: parseFlag(get("features.payments"), process.env.NEXT_PUBLIC_FEATURE_PAYMENTS, false),
    ai: parseFlag(get("features.ai"), process.env.NEXT_PUBLIC_FEATURE_AI, false),
    guides: parseFlag(get("features.guides"), process.env.NEXT_PUBLIC_FEATURE_GUIDES, true),
    newsletter: parseFlag(get("features.newsletter"), process.env.NEXT_PUBLIC_FEATURE_NEWSLETTER, false),
    blockAiCrawlers: parseFlag(get("features.blockAiCrawlers"), process.env.NEXT_PUBLIC_FEATURE_BLOCK_AI_CRAWLERS, false),
  };

  const theme: ThemeConfig = {
    defaultMode: themeMode,
    accent: get("theme.accent") || process.env.NEXT_PUBLIC_THEME_ACCENT || undefined,
    accent2: get("theme.accent2") || process.env.NEXT_PUBLIC_THEME_ACCENT_2 || undefined,
    font: get("theme.font") || process.env.NEXT_PUBLIC_THEME_FONT || undefined,
  };

  const analytics: SiteAnalytics = {
    googleSiteVerification:
      get("analytics.googleSiteVerification") || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    gaMeasurementId: get("analytics.gaMeasurementId") || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined,
  };

  const integrations: SiteIntegrations = {
    githubToken: get("integrations.githubToken") || process.env.GITHUB_TOKEN || undefined,
    githubRepo: get("integrations.githubRepo") || process.env.GITHUB_REPO || undefined,
    githubBranch: get("integrations.githubBranch") || process.env.GITHUB_BRANCH || undefined,
    vercelDeployHookUrl: get("integrations.vercelDeployHookUrl") || process.env.VERCEL_DEPLOY_HOOK_URL || undefined,
    emailProvider: get("integrations.emailProvider") || process.env.EMAIL_PROVIDER || undefined,
    emailFrom: get("integrations.emailFrom") || process.env.EMAIL_FROM || undefined,
    resendApiKey: get("integrations.resendApiKey") || process.env.RESEND_API_KEY || undefined,
    postmarkServerToken: get("integrations.postmarkServerToken") || process.env.POSTMARK_SERVER_TOKEN || undefined,
  };

  // NEXT_PUBLIC_SITE_MODE stays env-only (it selects a code path at build/boot, not display
  // config), so it's read directly rather than via a site_settings row.
  const rawMode = process.env.NEXT_PUBLIC_SITE_MODE;

  return {
    siteName: get("site.siteName") || process.env.NEXT_PUBLIC_SITE_NAME || "Tan Ho",
    title: get("site.title") || process.env.NEXT_PUBLIC_SITE_TITLE || DEFAULT_TITLE,
    description: get("site.description") || process.env.NEXT_PUBLIC_SITE_DESCRIPTION || DEFAULT_DESCRIPTION,
    author: get("site.author") || process.env.NEXT_PUBLIC_SITE_AUTHOR || "Tan Ho",
    tagline: get("site.tagline") || process.env.NEXT_PUBLIC_SITE_TAGLINE || "",
    locale: get("site.locale") || process.env.NEXT_PUBLIC_SITE_LOCALE || "en",
    url: (get("site.url") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
    features,
    mode: rawMode === "static" ? "static" : "dynamic",
    theme,
    analytics,
    integrations,
  };
});

function parseFlag(dbValue: string | undefined, envValue: string | undefined, fallback: boolean): boolean {
  if (dbValue !== undefined) return envFlag(dbValue, fallback);
  return envFlag(envValue, fallback);
}
