import type { MetadataRoute } from "next";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { getAiCrawlersSettings } from "@/modules/ai-crawlers/queries";
import { buildCrawlerRules } from "@/modules/ai-crawlers/robots-extra";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

/**
 * robots.txt from site settings. When indexable: allow all but the admin and
 * API surfaces, advertise the sitemap, and append per-AI-bot allow/block rules
 * from the AI & crawlers settings (citation vs training groups). When the site
 * is not indexable: disallow everything.
 *
 * The RSL pay-per-crawl price and llms.txt reference are advertised via the
 * generated /llms.txt file (Next's typed Robots object has no free-text slot);
 * llms.txt lives at the well-known /llms.txt path.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [general, seo, ai] = await Promise.all([
    getGeneralSettings(),
    getSeoSettings(),
    getAiCrawlersSettings(),
  ]);
  const base = (seo.siteUrl || BASE_FALLBACK).replace(/\/$/, "");

  if (!general.indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const baseRule = { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] };
  const botRules = buildCrawlerRules(ai);

  return {
    rules: [baseRule, ...botRules],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
