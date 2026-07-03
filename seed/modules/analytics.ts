import { settings } from "../../src/modules/settings/schema";
import { analyticsSettingsSchema } from "../../src/modules/analytics/validation";
import { log, type SeedDb } from "../lib";

/**
 * Neutral analytics defaults: both Google connect flags OFF. NO fake events —
 * the analytics screens' empty states are part of the design and must look
 * right out of the box. Idempotent (skips if present).
 */
export async function seedAnalytics(db: SeedDb): Promise<void> {
  const data = analyticsSettingsSchema.parse({ gaConnected: false, gscConnected: false });
  await db
    .insert(settings)
    .values({ namespace: "analytics", data })
    .onConflictDoNothing();
  log("settings.analytics seeded (connect flags off; no events)");
}
