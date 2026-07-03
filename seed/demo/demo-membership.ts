import { settings } from "../../src/modules/settings/schema";
import { membershipSettingsSchema } from "../../src/modules/memberships/validation";
import { log, type SeedDb } from "../lib";

/**
 * Demo membership tiers — Free / Member / Founding, matching the /membership
 * page's pricing block. Prices are integer CENTS. stripePriceId stays empty
 * (checkout is refused until real recurring Price ids are pasted). Upserts so
 * the demo is authoritative + idempotent.
 */
const DEMO_MEMBERSHIP = membershipSettingsSchema.parse({
  portalEnabled: true,
  tiers: [
    {
      slug: "free",
      name: "Free",
      priceCents: 0,
      cadence: "mo",
      features: ["Every public guide", "Monthly newsletter"],
      stripePriceId: "",
      featured: false,
    },
    {
      slug: "member",
      name: "Member",
      priceCents: 800,
      cadence: "mo",
      features: ["Full guide archive", "Members-only field notes", "Templates & checklists"],
      stripePriceId: "",
      featured: true,
    },
    {
      slug: "founding",
      name: "Founding",
      priceCents: 8000,
      cadence: "yr",
      features: ["Everything in Member", "Name in the credits", "A riso print, on me"],
      stripePriceId: "",
      featured: false,
    },
  ],
});

export async function seedDemoMembership(db: SeedDb): Promise<void> {
  await db
    .insert(settings)
    .values({ namespace: "membership", data: DEMO_MEMBERSHIP, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: DEMO_MEMBERSHIP, updatedAt: Date.now() },
    });
  log("demo membership tiers seeded (Free / Member / Founding)");
}
