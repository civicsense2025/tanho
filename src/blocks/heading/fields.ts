import { z } from "zod";
import { commonContent, styleContent } from "../common";

export const headingSchema = z.object({
  ...commonContent,
  ...styleContent,
  text: z.string().max(500),
  level: z.enum(["h1", "h2", "h3", "h4"]).default("h2"),
  align: z.enum(["left", "center", "right"]).default("left"),
});

export type HeadingContent = z.infer<typeof headingSchema>;

export const makeHeading = (): HeadingContent =>
  headingSchema.parse({ text: "A section heading", level: "h2", align: "left" });
