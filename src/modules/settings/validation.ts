import { z } from "zod";
import { seoSettingsSchema } from "@/modules/seo/validation";
import { peopleSettingsSchema } from "@/modules/people/people-settings";
import {
  ecommerceSettingsSchema,
  paymentsSettingsSchema,
} from "@/modules/commerce/validation";
import { membershipSettingsSchema } from "@/modules/memberships/validation";
import {
  availabilitySettingsSchema,
  extensionsSchema,
  templatesSchema,
} from "@/modules/scheduling/validation";
import { analyticsSettingsSchema } from "@/modules/analytics/validation";
import { aiCrawlersSettingsSchema } from "@/modules/ai-crawlers/validation";
import { contentTypesSettingsSchema } from "@/modules/custom-types/content-types-settings";
import { onboardingStateSchema } from "@/modules/onboarding/validation";
import { installStateSchema } from "@/modules/onboarding/install-validation";
import { marketplaceSettingsSchema } from "@/modules/marketplace/schema";
import { donationsSettingsSchema } from "@/modules/donations/validation";
import { domainSettingsSchema } from "@/modules/domain/validation";

/** Site identity + locale + visibility — the "General" settings screen. */
export const generalSettingsSchema = z.object({
  /** Site name: browser tabs, {site} SEO token, wordmark fallback. */
  name: z.string().min(1).max(120),
  tagline: z.string().max(300).default(""),
  timezone: z.string().min(1).default("UTC"),
  language: z.string().min(2).max(10).default("en"),
  /** When false the whole site is noindex + robots-disallowed. */
  indexable: z.boolean().default(true),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export const GENERAL_DEFAULTS: GeneralSettings = generalSettingsSchema.parse({
  name: "My Site",
});

/**
 * Registry of namespace → schema. Every settings write is parsed through
 * its namespace schema; unknown namespaces are rejected. Modules append
 * to this map from their own validation.ts as they land.
 */
export const settingsSchemas: Record<string, z.ZodTypeAny> = {
  general: generalSettingsSchema,
  // Header/footer/announcement are no longer settings namespaces — they are
  // block trees in `block_sets` under the chrome:header / chrome:footer owners
  // (see modules/chrome). Removed as part of the Phase 3 clean cutover.
  seo: seoSettingsSchema,
  people: peopleSettingsSchema,
  payments: paymentsSettingsSchema,
  ecommerce: ecommerceSettingsSchema,
  membership: membershipSettingsSchema,
  scheduling: availabilitySettingsSchema,
  sched_extensions: extensionsSchema,
  sched_templates: templatesSchema,
  analytics: analyticsSettingsSchema,
  ai_crawlers: aiCrawlersSettingsSchema,
  content_types: contentTypesSettingsSchema,
  onboarding: onboardingStateSchema,
  install: installStateSchema,
  marketplace: marketplaceSettingsSchema,
  donations: donationsSettingsSchema,
  domain: domainSettingsSchema,
};
