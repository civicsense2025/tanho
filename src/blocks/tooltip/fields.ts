import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const tooltipSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** The visible trigger text (dotted-underlined). */
  trigger: z.string().max(200).default(""),
  /** The tip shown on hover/focus. */
  tip: z.string().max(600).default(""),
  position: z.enum(["top", "bottom", "left", "right"]).default("top"),
});

export type TooltipContent = z.infer<typeof tooltipSchema>;

export const makeTooltip = (): TooltipContent =>
  tooltipSchema.parse({
    trigger: "hover me",
    tip: "Here's a helpful hint.",
    position: "top",
  });
