import { z } from "zod";
import { commonContent } from "../common";
import { mediaSrcSchema } from "../image/fields";

export const galleryImageSchema = z.object({
  src: mediaSrcSchema,
  alt: z.string().max(300).default(""),
  caption: z.string().max(300).default(""),
});

export const gallerySchema = z.object({
  ...commonContent,
  cols: z.number().int().min(2).max(4).default(3),
  images: z.array(galleryImageSchema).max(50).default([]),
});

export type GalleryContent = z.infer<typeof gallerySchema>;

export const makeGallery = (): GalleryContent =>
  gallerySchema.parse({
    cols: 3,
    images: [
      { src: "", alt: "", caption: "" },
      { src: "", alt: "", caption: "" },
      { src: "", alt: "", caption: "" },
    ],
  });
