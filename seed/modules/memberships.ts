import { settings } from "../../src/modules/settings/schema";
import {
  membershipSettingsSchema,
  type MembershipSettings,
} from "../../src/modules/memberships/validation";
import { log, type SeedDb } from "../lib";

/**
 * Neutral membership settings — two brand-agnostic EXAMPLE tiers so the
 * /membership page renders out of the box. stripePriceId is empty: checkout
 * stays refused until the owner pastes real recurring Price ids from Stripe.
 * NO real people are seeded. Edit these for your own cause.
 */
const NEUTRAL_MEMBERSHIP: MembershipSettings = membershipSettingsSchema.parse({
  portalEnabled: true,
  tiers: [
    {
      slug: "supporter",
      name: "Supporter",
      priceCents: 500,
      cadence: "mo",
      features: ["Support the work", "Members-only updates"],
      stripePriceId: "",
      featured: true,
    },
    {
      slug: "patron",
      name: "Patron",
      priceCents: 5000,
      cadence: "yr",
      features: ["Everything in Supporter", "A year of access", "Early access"],
      stripePriceId: "",
      featured: false,
    },
  ],
});

export async function seedMemberships(db: SeedDb) {
  await db
    .insert(settings)
    .values({ namespace: "membership", data: NEUTRAL_MEMBERSHIP })
    .onConflictDoNothing();
  log("settings.membership seeded with 2 example tiers (skip if present)");
}
