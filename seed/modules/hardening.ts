import { settings } from "../../src/modules/settings/schema";
import { policies } from "../../src/modules/policies/schema";
import { aiCrawlersSettingsSchema } from "../../src/modules/ai-crawlers/validation";
import { POLICY_TEMPLATES } from "../../src/modules/policies/templates";
import { policyInputSchema } from "../../src/modules/policies/validation";
import { log, type SeedDb } from "../lib";

/**
 * Hardening defaults: the ai_crawlers settings namespace (AI on, citation bots
 * allowed, training bots blocked, RSL/llms.txt off, sensible protection flags,
 * authoring on, personalization off) plus the three default SITE policy drafts
 * (Privacy/Terms/Cookies) with neutral, brand-free template text. No redirects.
 * Idempotent — onConflictDoNothing throughout.
 */
export async function seedHardening(db: SeedDb): Promise<void> {
  const ai = aiCrawlersSettingsSchema.parse({
    aiEnabled: true,
    allowCitationBots: true,
    allowTrainingBots: false,
    rsl: { enabled: false, priceUsd: "0.00", unit: "crawl" },
    llmsTxtEnabled: false,
    protection: {
      watermark: false,
      watermarkText: "",
      contentCredentials: false,
      noRightClick: false,
      hotlinkProtection: false,
    },
    authoring: { alt: true, seo: true, summarize: true },
    personalization: { recs: false, search: false, greeting: false },
    provider: { which: "builtin", model: "", monthlyCap: 0 },
  });

  await db
    .insert(settings)
    .values({ namespace: "ai_crawlers", data: ai })
    .onConflictDoNothing();
  log("settings.ai_crawlers seeded (skip if present)");

  for (const tmpl of POLICY_TEMPLATES) {
    const input = policyInputSchema.parse({
      slug: tmpl.slug,
      title: tmpl.title,
      group: tmpl.group,
      body: tmpl.body,
      status: "draft",
      footerLinked: false,
      effectiveDate: "",
    });
    await db.insert(policies).values(input).onConflictDoNothing();
  }
  log("policies seeded as drafts (Privacy/Terms/Cookies; skip if present)");
}
