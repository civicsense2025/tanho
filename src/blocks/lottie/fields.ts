import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent } from "../common";

export const lottieSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  /** URL or site-relative path to a Lottie/dotLottie JSON animation. */
  src: z
    .union([z.literal(""), z.string().max(2000).regex(/^(https:\/\/|\/)/)])
    .default(""),
  loop: z.boolean().default(true),
  /** When the animation starts: on load, or when it scrolls into view. */
  trigger: z.enum(["load", "in-view"]).default("in-view"),
  /** Max width so a full-frame animation doesn't overflow. */
  maxWidth: z.enum(["sm", "md", "lg", "full"]).default("md"),
  /** Fallback alt text for accessibility. */
  alt: z.string().max(300).default(""),
});

export type LottieContent = z.infer<typeof lottieSchema>;

export const makeLottie = (): LottieContent =>
  lottieSchema.parse({
    src: "",
    loop: true,
    trigger: "in-view",
    maxWidth: "md",
    alt: "",
  });
