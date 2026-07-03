import { getProfile } from "@/modules/profile/queries";
import type { ExperienceItem } from "@/modules/profile/schema";

/** Server-only: the profile's experience section. */
export async function resolveExperienceList(): Promise<ExperienceItem[]> {
  const p = await getProfile();
  return p.experience;
}
