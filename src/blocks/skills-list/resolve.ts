import { getProfile } from "@/modules/profile/queries";
import type { SkillGroup } from "@/modules/profile/schema";

/** Server-only: the profile's skills groups. */
export async function resolveSkillsList(): Promise<SkillGroup[]> {
  const p = await getProfile();
  return p.skills;
}
