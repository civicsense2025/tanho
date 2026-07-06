import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const stepperItemSchema = z.object({
  label: z.string().max(200).default(""),
  description: z.string().max(400).default(""),
});

export const stepperSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Layout axis: a horizontal rail or a vertical stack. */
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** Marker style: numbered circles or plain dots. */
  marker: z.enum(["number", "dot"]).default("number"),
  /** 1-based index of the current/active step (0 = none active). */
  current: z.number().int().min(0).max(50).default(1),
  items: z.array(stepperItemSchema).max(50).default([]),
});

export type StepperContent = z.infer<typeof stepperSchema>;

export const makeStepper = (): StepperContent =>
  stepperSchema.parse({
    orientation: "horizontal",
    marker: "number",
    current: 2,
    items: [
      { label: "Account", description: "Create your login." },
      { label: "Details", description: "Tell us about you." },
      { label: "Confirm", description: "Review and finish." },
    ],
  });
