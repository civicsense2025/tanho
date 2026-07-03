import { z } from "zod";
import { commonContent } from "../common";

/**
 * Media source: a site-relative media-library path or an https URL — or
 * empty (renders the striped placeholder). Blocks unsafe schemes outright.
 * Shared by the image, gallery, video and carousel blocks.
 */
export const mediaSrcSchema = z
  .union([z.literal(""), z.string().max(2000).regex(/^(https:\/\/|\/)/)])
  .default("");

export const imageSchema = z.object({
  ...commonContent,
  src: mediaSrcSchema,
  alt: z.string().max(300).default(""),
  caption: z.string().max(300).default(""),
});

export type ImageContent = z.infer<typeof imageSchema>;

export const makeImage = (): ImageContent =>
  imageSchema.parse({ src: "", alt: "Image", caption: "" });
