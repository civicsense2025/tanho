import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const accordionItemSchema = z.object({
  q: z.string().max(300).default(""),
  a: z.string().max(2000).default(""),
});

export const accordionSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  items: z.array(accordionItemSchema).max(50).default([]),
});

export type AccordionContent = z.infer<typeof accordionSchema>;

export const makeAccordion = (): AccordionContent =>
  accordionSchema.parse({
    items: [
      { q: "How does this work?", a: "Open a row to reveal its answer. Only plain text lives here." },
      { q: "Can I add more rows?", a: "Yes — each item is a question and answer pair." },
    ],
  });
