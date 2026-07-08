import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * Reviews block — a bound, dynamic block that renders the live review list +
 * summary aggregate + submit form for any reviewable target. Bound by
 * `targetType` + `targetId`. On a content-type detail template, set
 * `targetId` to `{{id}}` so fillBlockTree fills the per-row id; on a product
 * page or standalone page, set `targetId` to the concrete owner id. An empty
 * `targetId` renders nothing (the block was mis-placed).
 *
 * The resolver (resolve.ts, server-only) loads approved reviews, the cached
 * aggregate, the per-target config, and the current viewer; Render.tsx
 * delegates to the client `ReviewsRenderer` for interactivity (submit, vote,
 * sort). In the editor, a placeholder shows until the block is pre-resolved.
 */
export const reviewsSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** "product" | "entry:<entity>" | "custom:<slug>" | "page" | "post". */
  targetType: z.string().max(80).default(""),
  /** Owner id, or `{{id}}` on a content-type detail template. */
  targetId: z.string().max(120).default(""),
  /** Show the aggregate summary (average + distribution). */
  showSummary: z.boolean().default(true),
  /** Show the submit form (hidden when the target is disabled or viewer can't review). */
  showForm: z.boolean().default(true),
  /** Show the star-distribution bars under the average. */
  showDistribution: z.boolean().default(true),
  /** Default sort for the public list. */
  sortBy: z.enum(["recent", "helpful", "highest", "lowest"]).default("recent"),
  /** Max reviews to render server-side (beyond this, "load more" is client-side). */
  limit: z.number().int().min(1).max(50).default(10),
});

export type ReviewsContent = z.infer<typeof reviewsSchema>;

export const makeReviews = (): ReviewsContent =>
  reviewsSchema.parse({
    targetType: "",
    targetId: "",
    showSummary: true,
    showForm: true,
    showDistribution: true,
    sortBy: "recent",
    limit: 10,
  });
