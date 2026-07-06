import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const metricItemSchema = z.object({
  value: z.string().max(100).default(""),
  label: z.string().max(100).default(""),
});

export const metricSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  cols: z.number().int().min(2).max(4).default(3),
  items: z.array(metricItemSchema).max(50).default([]),
});

export type MetricContent = z.infer<typeof metricSchema>;

export const makeMetric = (): MetricContent =>
  metricSchema.parse({
    cols: 3,
    items: [
      { value: "12", label: "Projects" },
      { value: "99.9%", label: "Uptime" },
      { value: "4.9", label: "Avg rating" },
    ],
  });
