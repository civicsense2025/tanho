import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";
import { markdownToSafeHtml } from "@/lib/sanitize";

/**
 * Rich text stores EITHER markdown (md) or html — html wins when both are
 * set (legacy imports). New blocks seed `html` (edited via TipTap) and leave
 * `md` empty; legacy md-only content still renders via the md→html fallback.
 * Both are sanitized server-side at render.
 */
export const richtextSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  md: z.string().max(100_000).default(""),
  html: z.string().max(200_000).default(""),
});

export type RichtextContent = z.infer<typeof richtextSchema>;

export const makeRichtext = (): RichtextContent => {
  const defaultCopy =
    "Write freely here. This block accepts **rich text** and simple Markdown — the workhorse of most pages.";
  return richtextSchema.parse({ md: "", html: markdownToSafeHtml(defaultCopy) });
};
