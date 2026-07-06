import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * A static CTA card linking to the one site-wide /donate page — mirrors
 * checkoutDef's static cart-summary card. The donation flow itself (amount
 * entry, checkout) lives entirely at /donate; this block never embeds a
 * live widget or reads settings at render time.
 */
export const donationSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  heading: z.string().max(160).default("Support our work"),
  body: z.string().max(600).default(""),
  cta: z.string().max(60).default("Donate"),
});

export type DonationContent = z.infer<typeof donationSchema>;

export const makeDonation = (): DonationContent =>
  donationSchema.parse({
    heading: "Support our work",
    body: "Every contribution helps us keep going.",
    cta: "Donate",
  });
