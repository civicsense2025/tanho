import { z } from "zod";
import { commonContent } from "../common";

export const chartSeriesItemSchema = z.object({
  label: z.string().max(100).default(""),
  value: z.number().min(0).max(1_000_000_000).default(0),
});

export const chartSchema = z.object({
  ...commonContent,
  kind: z.enum(["bar", "line", "donut"]).default("bar"),
  title: z.string().max(200).default(""),
  series: z.array(chartSeriesItemSchema).max(50).default([]),
});

export type ChartSeriesItem = z.infer<typeof chartSeriesItemSchema>;
export type ChartContent = z.infer<typeof chartSchema>;

export const makeChart = (): ChartContent =>
  chartSchema.parse({
    kind: "bar",
    title: "",
    series: [
      { label: "Jan", value: 12 },
      { label: "Feb", value: 18 },
      { label: "Mar", value: 9 },
      { label: "Apr", value: 22 },
    ],
  });
