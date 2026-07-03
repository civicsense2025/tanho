import { z } from "zod";

/**
 * The `ai_crawlers` settings namespace — the "AI & crawlers" screen. A master
 * on/off plus five tab groups: Crawlers (per-bot robots.txt rules + RSL
 * pay-per-crawl + llms.txt), Protection, Authoring, Providers, Personalization.
 *
 * Authoring/Providers/Personalization are FLAGS ONLY this phase — no live AI
 * calls are wired yet; a real AI adapter is future work. The flags persist so
 * the screen is complete and the wiring lands without a schema change.
 */

/** Citation/search bots — the ones you generally WANT (drive referral traffic). */
export const CITATION_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "Google-NotebookLM",
] as const;

/** Training/scraping bots — the ones you may want to BLOCK from ingesting content. */
export const TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
  "Meta-ExternalAgent",
] as const;

const botMap = <T extends readonly string[]>(bots: T, on: boolean) =>
  z
    .record(z.string(), z.boolean())
    .default(Object.fromEntries(bots.map((b) => [b, on])));

const rslSchema = z.object({
  enabled: z.boolean().default(false),
  priceUsd: z.string().max(20).default("0.00"),
  unit: z.literal("crawl").default("crawl"),
});

const protectionSchema = z.object({
  watermark: z.boolean().default(false),
  watermarkText: z.string().max(120).default(""),
  contentCredentials: z.boolean().default(false),
  noRightClick: z.boolean().default(false),
  hotlinkProtection: z.boolean().default(false),
});

const authoringSchema = z.object({
  alt: z.boolean().default(true),
  seo: z.boolean().default(true),
  summarize: z.boolean().default(true),
});

const personalizationSchema = z.object({
  recs: z.boolean().default(false),
  search: z.boolean().default(false),
  greeting: z.boolean().default(false),
});

const providerSchema = z.object({
  which: z.enum(["builtin", "anthropic", "openai", "custom"]).default("builtin"),
  model: z.string().max(120).default(""),
  monthlyCap: z.number().int().min(0).max(1_000_000).default(0),
});

// Nested defaults parse each sub-schema's own defaults so `{}` fills the whole
// tree (zod v4 wants the object default to satisfy the schema's input type).
export const aiCrawlersSettingsSchema = z.object({
  aiEnabled: z.boolean().default(true),
  allowCitationBots: z.boolean().default(true),
  allowTrainingBots: z.boolean().default(false),
  citationBots: botMap(CITATION_BOTS, true),
  trainingBots: botMap(TRAINING_BOTS, false),
  rsl: rslSchema.default(() => rslSchema.parse({})),
  llmsTxtEnabled: z.boolean().default(false),
  protection: protectionSchema.default(() => protectionSchema.parse({})),
  authoring: authoringSchema.default(() => authoringSchema.parse({})),
  personalization: personalizationSchema.default(() =>
    personalizationSchema.parse({}),
  ),
  provider: providerSchema.default(() => providerSchema.parse({})),
});

export type AiCrawlersSettings = z.infer<typeof aiCrawlersSettingsSchema>;

export const AI_CRAWLERS_DEFAULTS: AiCrawlersSettings =
  aiCrawlersSettingsSchema.parse({});
