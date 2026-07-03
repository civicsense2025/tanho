import { z } from "zod";
import { commonContent, styleContent } from "./common";

/** Shared field shape for the profile-section bound blocks. Opts them into the
 * universal style layer (they're clean list containers — no self-padding cards or
 * full-bleed), so experience/skills/award/education lists all gain style controls. */
export function profileSectionSchema<T extends string>(source: T) {
  return z.object({
    ...commonContent,
    ...styleContent,
    source: z.literal(source).default(source),
    eyebrow: z.string().max(60).default(""),
  });
}
