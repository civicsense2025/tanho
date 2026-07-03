import { z } from "zod";
import { commonContent } from "../common";

export const progressItemSchema = z.object({
  label: z.string().max(200).default(""),
  pct: z.number().min(0).max(100).default(0),
});

export const progressSchema = z.object({
  ...commonContent,
  items: z.array(progressItemSchema).max(50).default([]),
});

export type ProgressContent = z.infer<typeof progressSchema>;

export const makeProgress = (): ProgressContent =>
  progressSchema.parse({
    items: [
      { label: "Design", pct: 80 },
      { label: "Build", pct: 45 },
    ],
  });
