import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const headingSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  text: z.string().max(500),
  level: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).default("h2"),
  align: z.enum(["left", "center", "right"]).default("left"),
});

export type HeadingContent = z.infer<typeof headingSchema>;

export const makeHeading = (): HeadingContent =>
  headingSchema.parse({ text: "A section heading", level: "h2", align: "left" });
