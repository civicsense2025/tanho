import { z } from "zod";
import { commonContent, styleContent } from "../common";

export const calloutSchema = z.object({
  ...commonContent,
  ...styleContent,
  tone: z.enum(["info", "tip", "warning", "danger"]).default("info"),
  title: z.string().max(200).default(""),
  body: z.string().max(2000).default(""),
});

export type CalloutContent = z.infer<typeof calloutSchema>;

export const makeCallout = (): CalloutContent =>
  calloutSchema.parse({
    tone: "info",
    title: "Good to know",
    body: "A short note that helps readers along.",
  });
