import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const flipCardSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  frontTitle: z.string().max(200).default(""),
  frontText: z.string().max(600).default(""),
  backTitle: z.string().max(200).default(""),
  backText: z.string().max(600).default(""),
  axis: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** What flips the card: hover (desktop) or tap/focus (works on touch + keyboard). */
  trigger: z.enum(["hover", "tap"]).default("hover"),
  minHeight: z.enum(["sm", "md", "lg"]).default("md"),
});

export type FlipCardContent = z.infer<typeof flipCardSchema>;

export const makeFlipCard = (): FlipCardContent =>
  flipCardSchema.parse({
    frontTitle: "Hover me",
    frontText: "There's more on the other side.",
    backTitle: "Nice to meet you",
    backText: "This is the back of the card.",
    axis: "horizontal",
    trigger: "hover",
    minHeight: "md",
  });
