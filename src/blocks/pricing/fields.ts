import { z } from "zod";
import { commonContent, trackEventSchema, trackParamsSchema } from "../common";

const hrefSchema = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:");

export const pricingTierSchema = z.object({
  name: z.string().max(80).default(""),
  price: z.string().max(60).default(""),
  cadence: z.string().max(40).default(""),
  features: z.array(z.string().max(160)).max(20).default([]),
  cta: z.string().max(60).default("Choose"),
  href: hrefSchema.default("#"),
  featured: z.boolean().default(false),
  /** When set, the tier CTA fires this analytics event on click. */
  trackEvent: trackEventSchema,
  params: trackParamsSchema,
});

/** Stripe-style tier table — author copy only. */
export const pricingSchema = z.object({
  ...commonContent,
  tiers: z.array(pricingTierSchema).max(6).default([]),
});

export type PricingContent = z.infer<typeof pricingSchema>;
export type PricingTier = z.infer<typeof pricingTierSchema>;

export const makePricing = (): PricingContent =>
  pricingSchema.parse({
    tiers: [
      {
        name: "Starter",
        price: "$0",
        cadence: "/mo",
        features: ["Core features", "Community support"],
        cta: "Get started",
        href: "#",
        featured: false,
      },
      {
        name: "Pro",
        price: "$19",
        cadence: "/mo",
        features: ["Everything in Starter", "Priority support", "Advanced tools"],
        cta: "Choose Pro",
        href: "#",
        featured: true,
      },
      {
        name: "Team",
        price: "$49",
        cadence: "/mo",
        features: ["Everything in Pro", "Team seats", "SSO"],
        cta: "Choose Team",
        href: "#",
        featured: false,
      },
    ],
  });
