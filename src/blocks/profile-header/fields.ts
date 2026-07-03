import { z } from "zod";
import { commonContent } from "../common";

/** Bound to the singleton profile — no author-set content beyond the source. */
export const profileHeaderSchema = z.object({
  ...commonContent,
  source: z.literal("profile").default("profile"),
});

export type ProfileHeaderContent = z.infer<typeof profileHeaderSchema>;

export const makeProfileHeader = (): ProfileHeaderContent =>
  profileHeaderSchema.parse({ source: "profile" });
