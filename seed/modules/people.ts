import { settings } from "../../src/modules/settings/schema";
import { PEOPLE_DEFAULTS } from "../../src/modules/people/people-settings";
import { log, type SeedDb } from "../lib";

/**
 * Neutral people settings. NO sample people are seeded — the CRM starts empty.
 * Newsletter lists are plain strings, so the "default" list needs no row; it
 * exists implicitly the first time someone subscribes to it.
 */
export async function seedPeople(db: SeedDb) {
  await db
    .insert(settings)
    .values({ namespace: "people", data: PEOPLE_DEFAULTS })
    .onConflictDoNothing();
  log("settings.people seeded (skip if present)");
}
