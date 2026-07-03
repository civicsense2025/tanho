import { z } from "zod";

/**
 * Marketplace settings — stored in the `settings` table under namespace
 * "marketplace". `enabled` is the master feature flag; `visibility` controls
 * whether the public catalog routes respond ("public") or 404 ("private").
 * `peerInstances` holds the URLs of other platform instances to browse in M6
 * (federated discovery).
 */
export const marketplaceSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  name: z.string().max(120).default(""),
  description: z.string().max(2000).default(""),
  visibility: z.enum(["public", "private"]).default("private"),
  peerInstances: z.array(z.string().max(300).trim()).max(50).default([]),
});

export type MarketplaceSettings = z.infer<typeof marketplaceSettingsSchema>;

export const MARKETPLACE_DEFAULTS: MarketplaceSettings =
  marketplaceSettingsSchema.parse({});
