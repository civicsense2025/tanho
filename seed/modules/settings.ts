import { settings } from "../../src/modules/settings/schema";
import {
  GENERAL_DEFAULTS,
  generalSettingsSchema,
} from "../../src/modules/settings/validation";
import { log, type SeedDb } from "../lib";

/**
 * Neutral general settings. THE white-label rule: this seed is the only
 * place default site copy lives — edit or replace it for your deployment.
 */
export async function seedSettings(db: SeedDb) {
  const general = generalSettingsSchema.parse({
    ...GENERAL_DEFAULTS,
    name: "My Site",
    tagline: "A site you own, end to end.",
  });

  await db
    .insert(settings)
    .values({ namespace: "general", data: general })
    .onConflictDoNothing();
  log("settings.general seeded (skip if present)");
}
