import { z } from "zod";
import { CURRENCIES } from "@/modules/commerce/validation";

/** Stripe caps custom_unit_amount.maximum at $10,000.00 — enforce the same bound here. */
const CUSTOM_AMOUNT_MAX_CENTS = 10_000_00;

/** Donations settings namespace — a customer-adjustable-amount checkout, separate from shop products. */
export const donationsSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  currency: z.enum(CURRENCIES).default("usd"),
  presetCents: z.number().int().min(100).max(CUSTOM_AMOUNT_MAX_CENTS).default(2500),
  minCents: z.number().int().min(100).max(CUSTOM_AMOUNT_MAX_CENTS).default(500),
  maxCents: z.number().int().min(100).max(CUSTOM_AMOUNT_MAX_CENTS).default(CUSTOM_AMOUNT_MAX_CENTS),
  heading: z.string().max(160).default("Support our work"),
  body: z.string().max(2000).default(""),
  stripeProductId: z.string().max(120).nullable().default(null),
  stripePriceId: z.string().max(120).nullable().default(null),
});
export type DonationsSettings = z.infer<typeof donationsSettingsSchema>;
export const DONATIONS_DEFAULTS: DonationsSettings = donationsSettingsSchema.parse({});
