import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { siteConfig } from "@/config/site.config";
import { AI_CROWLER_USER_AGENTS } from "@/lib/ai-crawlers";

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
  ];

  if (siteConfig.features.blockAiCrawlers) {
    for (const userAgent of AI_CROWLER_USER_AGENTS) {
      rules.push({ userAgent, disallow: "/" });
    }
  }

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
