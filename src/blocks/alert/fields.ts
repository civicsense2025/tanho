import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const alertSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  tone: z.enum(["info", "success", "warning", "error"]).default("info"),
  title: z.string().max(200).default(""),
  body: z.string().max(2000).default(""),
  /** Show the leading tone glyph. */
  icon: z.boolean().default(true),
});

export type AlertContent = z.infer<typeof alertSchema>;

export const makeAlert = (): AlertContent =>
  alertSchema.parse({
    tone: "info",
    title: "Heads up",
    body: "A short status message for your readers.",
    icon: true,
  });
