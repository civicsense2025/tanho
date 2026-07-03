import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  MEMBERSHIP_DEFAULTS,
  membershipSettingsSchema,
  type MembershipSettings,
  type MembershipTier,
} from "./validation";

/**
 * Cached membership settings (tier catalog + portal flag). Revalidated via
 * updateTag("settings:membership") on save. Falls back to neutral defaults so
 * the module renders before seeding.
 */
export async function getMembershipSettings(): Promise<MembershipSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:membership");
  const parsed = membershipSettingsSchema.safeParse(
    await readSettingRow("membership"),
  );
  return parsed.success ? parsed.data : MEMBERSHIP_DEFAULTS;
}

/** Uncached read for server actions/webhooks (read-your-own-writes). */
export async function readMembershipSettings(): Promise<MembershipSettings> {
  const parsed = membershipSettingsSchema.safeParse(
    await readSettingRow("membership"),
  );
  return parsed.success ? parsed.data : MEMBERSHIP_DEFAULTS;
}

/** The public tier catalog. */
export async function getMembershipTiers(): Promise<MembershipTier[]> {
  return (await getMembershipSettings()).tiers;
}

/** One tier by slug, or null. Uncached — safe to call inside actions. */
export async function tierBySlug(slug: string): Promise<MembershipTier | null> {
  const { tiers } = await readMembershipSettings();
  return tiers.find((t) => t.slug === slug) ?? null;
}
