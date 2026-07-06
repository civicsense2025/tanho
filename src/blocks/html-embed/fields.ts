import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const htmlEmbedSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Raw embed HTML (an <iframe>, video player, or widget snippet). Sanitised on
   *  render: <script> is stripped, iframes are sandboxed + https-only. For arbitrary
   *  <script>, use the owner-only page code slot instead. */
  html: z.string().max(10000).default(""),
});

export type HtmlEmbedContent = z.infer<typeof htmlEmbedSchema>;

export const makeHtmlEmbed = (): HtmlEmbedContent =>
  htmlEmbedSchema.parse({ html: "" });
