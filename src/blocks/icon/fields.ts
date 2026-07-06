import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const iconSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** An emoji or single character. */
  glyph: z.string().max(8).default("★"),
  size: z.enum(["sm", "md", "lg", "xl"]).default("md"),
  color: z.enum(["default", "muted", "accent", "accent-2"]).default("default"),
  /** Accessible label; when empty the glyph is decorative (aria-hidden). */
  label: z.string().max(120).default(""),
});

export type IconContent = z.infer<typeof iconSchema>;

export const makeIcon = (): IconContent =>
  iconSchema.parse({
    glyph: "★",
    size: "md",
    color: "default",
    label: "",
  });
