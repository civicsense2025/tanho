import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent } from "../common";

export const marqueeSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  /** Newline- or comma-free items scrolled in a loop. */
  items: z.array(z.string().max(200)).max(50).default([]),
  direction: z.enum(["left", "right"]).default("left"),
  speed: z.enum(["slow", "normal", "fast"]).default("normal"),
  /** Pause the scroll while hovered. */
  pauseOnHover: z.boolean().default(true),
});

export type MarqueeContent = z.infer<typeof marqueeSchema>;

export const makeMarquee = (): MarqueeContent =>
  marqueeSchema.parse({
    items: ["Ship fast", "Lamina", "No lock-in", "Yours forever"],
    direction: "left",
    speed: "normal",
    pauseOnHover: true,
  });
