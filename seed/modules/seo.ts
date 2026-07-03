import { settings } from "../../src/modules/settings/schema";
import { seoSettingsSchema } from "../../src/modules/seo/validation";
import { log, type SeedDb } from "../lib";

/**
 * Neutral SEO settings — empty site URL (falls back to APP_URL), sitemap
 * on, and the per-content-type metadata templates. Skipped if present.
 */
export async function seedSeo(db: SeedDb) {
  const seo = seoSettingsSchema.parse({
    siteUrl: "",
    defaultOgMediaId: null,
    sitemapEnabled: true,
    templates: {
      page: { title: "{title} · {site}", description: "{excerpt}" },
      post: { title: "{title} — {site}", description: "{excerpt}" },
      project: { title: "{title} — {tag} · {site}", description: "{excerpt}" },
      guide: { title: "{title} · Guides · {site}", description: "{excerpt}" },
      resource: { title: "{title} · {site}", description: "{excerpt}" },
    },
  });

  await db
    .insert(settings)
    .values({ namespace: "seo", data: seo })
    .onConflictDoNothing();
  log("settings.seo seeded (skip if present)");
}
