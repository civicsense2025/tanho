import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";
import { mediaSrcSchema } from "../image/fields";

export const carouselSlideSchema = z.object({
  src: mediaSrcSchema,
  caption: z.string().max(300).default(""),
});

export const carouselSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
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
