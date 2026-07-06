import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const timelineItemSchema = z.object({
  date: z.string().max(100).default(""),
  title: z.string().max(200).default(""),
  note: z.string().max(500).default(""),
});

export const timelineSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  items: z.array(timelineItemSchema).max(50).default([]),
});

export type TimelineContent = z.infer<typeof timelineSchema>;

export const makeTimeline = (): TimelineContent =>
  timelineSchema.parse({
    items: [
      { date: "2024", title: "Milestone one", note: "What happened first." },
      { date: "2025", title: "Milestone two", note: "What happened next." },
    ],
  });
