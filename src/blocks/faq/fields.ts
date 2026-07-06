import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const faqItemSchema = z.object({
  q: z.string().max(300).default(""),
  a: z.string().max(2000).default(""),
});

export const faqSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  items: z.array(faqItemSchema).max(50).default([]),
});

export type FaqContent = z.infer<typeof faqSchema>;

export const makeFaq = (): FaqContent =>
  faqSchema.parse({
    items: [
      { q: "How does this work?", a: "Open a row to reveal its answer. Only plain text lives here." },
      { q: "Is it good for SEO?", a: "Yes — this block also emits FAQ structured data for search engines." },
    ],
  });
