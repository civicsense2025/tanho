import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const badgeSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  text: z.string().max(60).default("New"),
  tone: z.enum(["neutral", "accent", "success", "warning"]).default("accent"),
  /** A short leading emoji/char shown before the text. */
  icon: z.string().max(4).default(""),
});

export type BadgeContent = z.infer<typeof badgeSchema>;

export const makeBadge = (): BadgeContent =>
  badgeSchema.parse({
    text: "New",
    tone: "accent",
    icon: "",
  });
