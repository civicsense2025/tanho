import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  ECOMMERCE_DEFAULTS,
  ecommerceSettingsSchema,
  type EcommerceSettings,
} from "./validation";

/**
 * Cached ecommerce settings. Revalidated via updateTag("settings:ecommerce")
 * on save. Falls back to neutral defaults (store locked) before seeding.
 */
export async function getEcommerceSettings(): Promise<EcommerceSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:ecommerce");
  const parsed = ecommerceSettingsSchema.safeParse(await readSettingRow("ecommerce"));
  return parsed.success ? parsed.data : ECOMMERCE_DEFAULTS;
}

/** Uncached read for server actions (read-your-own-writes). */
export async function readEcommerceSettings(): Promise<EcommerceSettings> {
  const parsed = ecommerceSettingsSchema.safeParse(await readSettingRow("ecommerce"));
  return parsed.success ? parsed.data : ECOMMERCE_DEFAULTS;
}
