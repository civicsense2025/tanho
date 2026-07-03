import { z } from "zod";
import { commonContent } from "./common";

/** Shared field shape for the profile-section bound blocks. */
export function profileSectionSchema<T extends string>(source: T) {
  return z.object({
    ...commonContent,
    source: z.literal(source).default(source),
    eyebrow: z.string().max(60).default(""),
  });
}
