"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { settings } from "@/modules/settings/schema";
import { ecommerceSettingsSchema } from "./validation";
import { readEcommerceSettings } from "./ecommerce-settings";

/**
 * Store-enable server action, in its own `"use server"` file so client
 * components (the locked-store upsell) can import it without dragging the
 * `"use cache"` getters from `ecommerce-settings.ts` into the browser bundle.
 *
 * Unlock the store (owner-only). Flips `unlocked` true in the ecommerce
 * settings namespace, preserving any other fields. Audited.
 */
export async function unlockStore(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser("owner");
  const current = await readEcommerceSettings();
  const next = ecommerceSettingsSchema.parse({ ...current, unlocked: true });
  await db
    .insert(settings)
    .values({ namespace: "ecommerce", data: next, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: next, updatedAt: Date.now() },
    });
  updateTag("settings:ecommerce");
  await writeAudit({
    userId: user.id,
    action: "ecommerce.unlock",
    ownerType: "settings",
    ownerId: "ecommerce",
  });
  return { ok: true };
}
