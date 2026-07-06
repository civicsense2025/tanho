import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const quoteSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  text: z.string().max(1000).default(""),
  cite: z.string().max(200).default(""),
});

export type QuoteContent = z.infer<typeof quoteSchema>;

export const makeQuote = (): QuoteContent =>
  quoteSchema.parse({
    text: "The details are not the details. They make the design.",
    cite: "Charles Eames",
  });
