import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * Paywall — a server-enforced cut line. Every sibling block AFTER this one
 * (at the same tree level) is withheld from readers who lack access; the
 * walker never serializes gated content for them beyond the configured
 * preview depth. `tier` empty = any active member; a tier name requires that
 * specific tier.
 *
 * Preview depth (both default 0 = today's exact binary cut, opt-in only):
 * `anonPreviewBlocks` reveals that many sibling blocks past the wall to
 * signed-out visitors; `subscriberPreviewBlocks` reveals that many to a
 * signed-in reader who isn't (yet) an active member of the required tier.
 * Either can be raised independently — a subscriber preview does not need to
 * be >= the anon preview, since a creator may want a subscriber to see LESS
 * of a *different* selection, though the common case is subscriber >= anon.
 */
export const paywallSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
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
  anonPreviewBlocks: z.number().int().min(0).max(20).default(0),
  subscriberPreviewBlocks: z.number().int().min(0).max(20).default(0),
  subscriberNudge: z.string().max(200).default(""),
});

export type PaywallContent = z.infer<typeof paywallSchema>;

export const makePaywall = (): PaywallContent =>
  paywallSchema.parse({});
