import { z } from "zod";
import { commonContent } from "../common";

export const spacerSchema = z.object({
  ...commonContent,
  size: z.number().min(4).max(200).default(32),
});

export type SpacerContent = z.infer<typeof spacerSchema>;

export const makeSpacer = (): SpacerContent => spacerSchema.parse({ size: 32 });
