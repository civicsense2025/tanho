import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * Social links row — resolves a saved menu (by id) into a compact row of
 * links. Replaces the footer's `socialMenuId`. A **bound** block.
 */
export const socialLinksSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Menu whose items become the social row; empty = renders nothing. */
  menuId: z.string().max(64).default(""),
  align: z.enum(["left", "center", "right"]).default("left"),
});

export type SocialLinksContent = z.infer<typeof socialLinksSchema>;

export const makeSocialLinks = (): SocialLinksContent =>
  socialLinksSchema.parse({ menuId: "", align: "left" });
