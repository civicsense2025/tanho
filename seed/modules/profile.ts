import { profile } from "../../src/modules/profile/schema";
import { log, type SeedDb } from "../lib";

/**
 * Neutral profile singleton — empty. Name/bio/sections are filled in by the
 * site owner via Admin → Content → Profile; the hero falls back to the site
 * name until then. No brand content here (white-label rule).
 */
export async function seedProfile(db: SeedDb): Promise<void> {
  const existing = await db.query.profile.findFirst();
  if (existing) {
    log("profile: already exists — skipping");
    return;
  }
  await db.insert(profile).values({
    id: "profile",
    name: "",
    bio: "",
    avatarMediaId: null,
    experience: [],
    skills: [],
    awards: [],
    education: [],
  });
  log("profile singleton seeded (empty)");
}
