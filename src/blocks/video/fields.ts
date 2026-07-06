import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";
import { mediaSrcSchema } from "../image/fields";

export const videoSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  src: mediaSrcSchema,
  poster: mediaSrcSchema,
  caption: z.string().max(300).default(""),
});

export type VideoContent = z.infer<typeof videoSchema>;

export const makeVideo = (): VideoContent =>
  videoSchema.parse({ src: "", poster: "", caption: "" });
