import { z } from "zod";

/**
 * Membership settings — the tier catalog. Tiers are DATA (white-label rule):
 * names, prices, and Stripe price ids all live here, never in code. Prices
 * are integer CENTS. `stripePriceId` is the recurring Price id pasted from the
 * Stripe dashboard; empty until the owner connects a real subscription price.
 */
export const membershipTierSchema = z.object({
  id: z.string().max(60).default(""),
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only"),
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(0).max(100_000_00),
  cadence: z.enum(["mo", "yr"]).default("mo"),
  features: z.array(z.string().max(120)).max(10).default([]),
  stripePriceId: z.string().max(120).default(""),
  featured: z.boolean().default(false),
});
export type MembershipTier = z.infer<typeof membershipTierSchema>;

export const membershipSettingsSchema = z.object({
  tiers: z.array(membershipTierSchema).max(6).default([]),
  /** When true, active members get a "Manage membership" Billing Portal link. */
  portalEnabled: z.boolean().default(true),
});
export type MembershipSettings = z.infer<typeof membershipSettingsSchema>;

export const MEMBERSHIP_DEFAULTS: MembershipSettings =
  membershipSettingsSchema.parse({});
