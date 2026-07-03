import { getProfile } from "@/modules/profile/queries";
import type { AwardItem } from "@/modules/profile/schema";

/** Server-only: the profile's awards section. */
export async function resolveAwardList(): Promise<AwardItem[]> {
  const p = await getProfile();
  return p.awards;
}
