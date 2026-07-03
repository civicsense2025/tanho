"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { settings } from "@/modules/settings/schema";
import { readDonationsSettings } from "./donations-settings";
import { donationsSettingsSchema } from "./validation";
import { syncDonationsToStripe } from "./sync";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Save donations settings (owner-only). Re-syncs the Stripe Product/Price
 * only when the amount configuration actually changed, mirroring
 * product-actions.ts's becameActive/priceChanged re-sync trigger.
 */
export async function saveDonationsSettings(input: unknown): Promise<Result> {
  const user = await requireUser("owner");
  const parsed = donationsSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }
  const existing = await readDonationsSettings();
  const data = parsed.data;

  const amountsChanged =
    data.currency !== existing.currency ||
    data.minCents !== existing.minCents ||
    data.maxCents !== existing.maxCents ||
    data.presetCents !== existing.presetCents;

  let stripeProductId = existing.stripeProductId;
  let stripePriceId = existing.stripePriceId;
  if (data.enabled && (amountsChanged || !existing.stripePriceId)) {
    const synced = await syncDonationsToStripe({ ...data, stripeProductId, stripePriceId });
    stripeProductId = synced.stripeProductId;
    stripePriceId = synced.stripePriceId;
  }

  const toSave = { ...data, stripeProductId, stripePriceId };
  await db
    .insert(settings)
    .values({ namespace: "donations", data: toSave, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: toSave, updatedAt: Date.now() },
    });

  updateTag("settings:donations");
  await writeAudit({
    userId: user.id,
    action: "settings.save",
    ownerType: "settings",
    ownerId: "donations",
  });
  return { ok: true };
}
