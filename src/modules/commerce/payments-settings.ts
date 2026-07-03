import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  PAYMENTS_DEFAULTS,
  paymentsSettingsSchema,
  type PaymentsSettings,
} from "./validation";

/**
 * Cached payments settings. Revalidated via updateTag("settings:payments")
 * on save. Falls back to neutral defaults so commerce works before seeding.
 */
export async function getPaymentsSettings(): Promise<PaymentsSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:payments");
  const parsed = paymentsSettingsSchema.safeParse(await readSettingRow("payments"));
  return parsed.success ? parsed.data : PAYMENTS_DEFAULTS;
}

/** Uncached read for server actions (read-your-own-writes). */
export async function readPaymentsSettings(): Promise<PaymentsSettings> {
  const parsed = paymentsSettingsSchema.safeParse(await readSettingRow("payments"));
  return parsed.success ? parsed.data : PAYMENTS_DEFAULTS;
}
