import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const counterSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** The number to count up to. */
  value: z.number().default(100),
  prefix: z.string().max(12).default(""),
  suffix: z.string().max(12).default(""),
  /** Decimal places to display (thousands are grouped automatically). */
  decimals: z.number().int().min(0).max(4).default(0),
  /** Count-up duration in ms. */
  duration: z.number().int().min(0).max(10000).default(1600),
  label: z.string().max(200).default(""),
});

export type CounterContent = z.infer<typeof counterSchema>;

export const makeCounter = (): CounterContent =>
  counterSchema.parse({
    value: 1200,
    prefix: "",
    suffix: "+",
    decimals: 0,
    duration: 1600,
    label: "Happy customers",
  });
