import { eq } from "drizzle-orm";
import { settings } from "../../../src/modules/settings/schema";
import { ecommerceSettingsSchema } from "../../../src/modules/commerce/validation";
import type { SeedDb } from "../../lib";

/**
 * Flip the ecommerce store to unlocked (SAMPLE_UNLOCK=1) so the enabled
 * storefront path is explorable. Preserves any other ecommerce fields. Payments
 * still need real Stripe keys to actually charge — checkout shows the connect
 * state until then; this only lifts the module lock.
 */
export async function unlockEcommerceForSample(db: SeedDb): Promise<void> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.namespace, "ecommerce"),
  });
  const current = ecommerceSettingsSchema.safeParse(row?.data);
  const next = ecommerceSettingsSchema.parse({
    ...(current.success ? current.data : {}),
    unlocked: true,
  });
  await db
    .insert(settings)
    .values({ namespace: "ecommerce", data: next, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: next, updatedAt: Date.now() },
    });
}
