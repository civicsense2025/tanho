import { z } from "zod";
import { commonContent } from "../common";

/**
 * Paywall — a server-enforced cut line. Every sibling block AFTER this one
 * (at the same tree level) is withheld from readers who lack access; the
 * walker never serializes gated content for them. `tier` empty = any active
 * member; a tier name requires that specific tier.
 */
export const paywallSchema = z.object({
  ...commonContent,
  tier: z.string().max(60).default(""),
  title: z.string().max(200).default("The rest is for members"),
  body: z.string().max(500).default("Become a member to keep reading."),
  cta: z.string().max(60).default("Unlock full access"),
  ctaHref: z
    .string()
    .max(200)
    .regex(/^(https?:\/\/|\/|#)/, "Must be a URL, path, or #anchor")
    .default("/membership"),
  note: z.string().max(160).default(""),
});

export type PaywallContent = z.infer<typeof paywallSchema>;

export const makePaywall = (): PaywallContent =>
  paywallSchema.parse({});
