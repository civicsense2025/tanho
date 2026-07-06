import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const toggleSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  leftLabel: z.string().max(60).default("Monthly"),
  rightLabel: z.string().max(60).default("Annual"),
  /** Which side reads as selected. Static — a visual segmented control, not a real switch. */
  active: z.enum(["left", "right"]).default("left"),
  note: z.string().max(120).default(""),
});

export type ToggleContent = z.infer<typeof toggleSchema>;

export const makeToggle = (): ToggleContent =>
  toggleSchema.parse({
    leftLabel: "Monthly",
    rightLabel: "Annual",
    active: "left",
    note: "Save 20%",
  });
