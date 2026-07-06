import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";
import { mediaSrcSchema } from "../image/fields";

export const beforeAfterSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  beforeSrc: mediaSrcSchema,
  afterSrc: mediaSrcSchema,
  beforeAlt: z.string().max(300).default(""),
  afterAlt: z.string().max(300).default(""),
  beforeLabel: z.string().max(40).default("Before"),
  afterLabel: z.string().max(40).default("After"),
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** Initial divider position, 0–100%. */
  start: z.number().int().min(0).max(100).default(50),
});

export type BeforeAfterContent = z.infer<typeof beforeAfterSchema>;

export const makeBeforeAfter = (): BeforeAfterContent =>
  beforeAfterSchema.parse({
    beforeSrc: "",
    afterSrc: "",
    beforeAlt: "Before",
    afterAlt: "After",
    beforeLabel: "Before",
    afterLabel: "After",
    orientation: "horizontal",
    start: 50,
  });
