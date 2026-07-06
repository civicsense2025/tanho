import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/** Safe link targets only: web URLs, site-relative paths, anchors, mailto — or
 *  empty (button not linked yet). Same allowlist as menus/buttons. */
const hrefSchema = z
  .union([
    z.string().max(2000).regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:"),
    z.literal(""),
  ])
  .default("");

/**
 * Header/footer call-to-action — an anchor styled like the core Button. Ported
 * from the config-driven header CTA (`cta.enabled/label/href/variant`); the
 * block itself IS the CTA, so "enabled" is simply whether the block exists.
 */
export const ctaButtonSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  label: z.string().max(40).default("Get started"),
  href: hrefSchema,
  variant: z.enum(["solid", "accent", "outline"]).default("solid"),
});

export type CtaButtonContent = z.infer<typeof ctaButtonSchema>;

export const makeCtaButton = (): CtaButtonContent =>
  ctaButtonSchema.parse({ label: "Get started", href: "", variant: "solid" });
