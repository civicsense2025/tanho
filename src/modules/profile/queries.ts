import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getGeneralSettings } from "@/modules/settings/queries";
import { profile, type ProfileRow } from "./schema";

const EMPTY: ProfileRow = {
  id: "profile",
  name: "",
  bio: "",
  avatarMediaId: null,
  experience: [],
  skills: [],
  awards: [],
  education: [],
  updatedAt: 0,
};

/**
 * The singleton profile — cached, tagged "profile". Falls back to an empty
 * record; the name falls back to the general-settings site name so the hero
 * always has something to show even before the profile is filled in.
 */
export async function getProfile(): Promise<ProfileRow> {
  "use cache";
  cacheLife("max");
  cacheTag("profile");
  const row = await db.query.profile.findFirst({ where: eq(profile.id, "profile") });
  const base = row ?? EMPTY;
  if (base.name) return base;
  const general = await getGeneralSettings();
  return { ...base, name: general.name };
}
