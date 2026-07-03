import { z } from "zod";
import { commonContent, styleContent } from "../common";

/**
 * Rich text stores EITHER markdown (md) or html — html wins when both are
 * set (legacy imports). Both are sanitized server-side at render.
 */
export const richtextSchema = z.object({
  ...commonContent,
  ...styleContent,
  md: z.string().max(100_000).default(""),
  html: z.string().max(200_000).default(""),
});

export type RichtextContent = z.infer<typeof richtextSchema>;

export const makeRichtext = (): RichtextContent =>
  richtextSchema.parse({
    md: "Write freely here. This block accepts **rich text** and simple Markdown — the workhorse of most pages.",
  });
