import { z } from "zod";
import { commonContent, styleContent } from "../common";
import { mediaSrcSchema } from "../image/fields";

export const carouselSlideSchema = z.object({
  src: mediaSrcSchema,
  caption: z.string().max(300).default(""),
});

export const carouselSchema = z.object({
  ...commonContent,
  ...styleContent,
  slides: z.array(carouselSlideSchema).max(50).default([]),
});

export type CarouselContent = z.infer<typeof carouselSchema>;

export const makeCarousel = (): CarouselContent =>
  carouselSchema.parse({
    slides: [
      { src: "", caption: "Slide 1" },
      { src: "", caption: "Slide 2" },
      { src: "", caption: "Slide 3" },
    ],
  });
