import { settings } from "../../src/modules/settings/schema";
import {
  ECOMMERCE_DEFAULTS,
  PAYMENTS_DEFAULTS,
} from "../../src/modules/commerce/validation";
import { log, type SeedDb } from "../lib";

/**
 * Neutral commerce settings — payments + ecommerce namespaces at their
 * defaults (store LOCKED, no currency assumptions changed). NO sample
 * products, collections, or orders: the shop starts empty and the owner
 * unlocks it from the admin.
 */
export async function seedCommerce(db: SeedDb) {
  await db
    .insert(settings)
    .values({ namespace: "payments", data: PAYMENTS_DEFAULTS })
    .onConflictDoNothing();
  await db
    .insert(settings)
    .values({ namespace: "ecommerce", data: ECOMMERCE_DEFAULTS })
    .onConflictDoNothing();
  log("settings.payments + settings.ecommerce seeded (skip if present)");
}
