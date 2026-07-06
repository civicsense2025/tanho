import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const ratingSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** 0–5, in .5 steps. */
  value: z.number().min(0).max(5).default(4.5),
  max: z.number().int().min(1).max(10).default(5),
  showValue: z.boolean().default(true),
  label: z.string().max(120).default(""),
});

export type RatingContent = z.infer<typeof ratingSchema>;

export const makeRating = (): RatingContent =>
  ratingSchema.parse({
    value: 4.5,
    max: 5,
    showValue: true,
    label: "",
  });
