import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import { DONATIONS_DEFAULTS, donationsSettingsSchema, type DonationsSettings } from "./validation";

/** Cached donations settings. Revalidated via updateTag("settings:donations") on save. */
export async function getDonationsSettings(): Promise<DonationsSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:donations");
  const parsed = donationsSettingsSchema.safeParse(await readSettingRow("donations"));
  return parsed.success ? parsed.data : DONATIONS_DEFAULTS;
}

/** Uncached read for server actions (read-your-own-writes). */
export async function readDonationsSettings(): Promise<DonationsSettings> {
  const parsed = donationsSettingsSchema.safeParse(await readSettingRow("donations"));
  return parsed.success ? parsed.data : DONATIONS_DEFAULTS;
}
