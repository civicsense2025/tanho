import { getProfile } from "@/modules/profile/queries";
import type { EducationItem } from "@/modules/profile/schema";

/** Server-only: the profile's education section. */
export async function resolveEducationList(): Promise<EducationItem[]> {
  const p = await getProfile();
  return p.education;
}
