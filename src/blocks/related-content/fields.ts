import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const relatedContentSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Optional heading above the list (empty = none). */
  title: z.string().max(80).default("Related"),
  /** Heading level for the title, so the block fits its surrounding document
   *  outline (an h2 nested under an h3 section is an a11y/SEO level-skip). */
  headingLevel: z.enum(["h2", "h3", "h4"]).default("h2"),
  /** Which content type to pull from (entity key, e.g. "project", "guide"). */
  type: z.string().max(64).default("project"),
  /** Selection strategy: newest first, or matching a tag. */
  by: z.enum(["recent", "tag"]).default("recent"),
  /** Tag to match when `by` = "tag" (case-insensitive). */
  tag: z.string().max(60).default(""),
  /** Max items shown. */
  limit: z.number().int().min(1).max(24).default(3),
  /** Grid columns on wide screens. */
  cols: z.number().int().min(1).max(4).default(3),
});

export type RelatedContentContent = z.infer<typeof relatedContentSchema>;

export const makeRelatedContent = (): RelatedContentContent =>
  relatedContentSchema.parse({});
