import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const pollOptionSchema = z.object({
  /** The option label. */
  label: z.string().max(200).default(""),
  /** Seed vote count — lets an author show plausible initial results; client
   *  votes add to it in the browser (see the poll enhancement). */
  seed: z.number().int().min(0).max(1_000_000).default(0),
});

export type PollOption = z.infer<typeof pollOptionSchema>;

export const pollSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  question: z.string().max(300).default(""),
  options: z.array(pollOptionSchema).min(2).max(10).default([]),
});

export type PollContent = z.infer<typeof pollSchema>;

export const makePoll = (): PollContent =>
  pollSchema.parse({
    question: "What matters most to you?",
    options: [
      { label: "Speed", seed: 0 },
      { label: "Simplicity", seed: 0 },
      { label: "Price", seed: 0 },
    ],
  });
