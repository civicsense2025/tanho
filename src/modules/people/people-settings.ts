import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { readSettingRow } from "@/modules/settings/queries";

/**
 * People settings — the account/newsletter/directory policy surface. Every
 * field has a neutral default so the module works before the screen is saved.
 */
export const peopleSettingsSchema = z.object({
  // Accounts
  signups: z.enum(["open", "invite-only"]).default("open"),
  verifyEmail: z.boolean().default(false),
  approveMembers: z.boolean().default(false),
  defaultRole: z.enum(["reader", "subscriber", "member"]).default("subscriber"),
  // Newsletter
  newsletterEnabled: z.boolean().default(true),
  doubleOptIn: z.boolean().default(true),
  welcomeEmail: z.boolean().default(true),
  defaultList: z.string().min(1).max(60).default("default"),
  // Public profiles / directory
  publicProfiles: z.boolean().default(false),
  showAvatars: z.boolean().default(false),
  showJoined: z.boolean().default(false),
  directory: z.boolean().default(false),
  profileBase: z.string().min(1).max(60).default("/u/"),
  gravatar: z.boolean().default(false),
  // Privacy / compliance
  activityLog: z.boolean().default(true),
  selfExport: z.boolean().default(true),
});

export type PeopleSettings = z.infer<typeof peopleSettingsSchema>;

export const PEOPLE_DEFAULTS: PeopleSettings = peopleSettingsSchema.parse({});

/**
 * Cached people settings. Revalidated via updateTag("settings:people") on
 * save. Falls back to neutral defaults so the site renders before seeding.
 */
export async function getPeopleSettings(): Promise<PeopleSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:people");
  const data = await readSettingRow("people");
  const parsed = peopleSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : PEOPLE_DEFAULTS;
}

/** Uncached read for server actions (read-your-own-writes). */
export async function readPeopleSettings(): Promise<PeopleSettings> {
  const parsed = peopleSettingsSchema.safeParse(await readSettingRow("people"));
  return parsed.success ? parsed.data : PEOPLE_DEFAULTS;
}
