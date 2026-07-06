import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const tabItemSchema = z.object({
  label: z.string().max(120).default(""),
  body: z.string().max(4000).default(""),
});

export const tabsSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  variant: z.enum(["underline", "pill"]).default("underline"),
  items: z.array(tabItemSchema).max(20).default([]),
});

export type TabsContent = z.infer<typeof tabsSchema>;

export const makeTabs = (): TabsContent =>
  tabsSchema.parse({
    orientation: "horizontal",
    variant: "underline",
    items: [
      { label: "Overview", body: "The big picture goes here." },
      { label: "Details", body: "The specifics live on this tab." },
      { label: "FAQ", body: "Answers to common questions." },
    ],
  });
