import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * A live list of a content type's published rows, as a card grid. Bound to a
 * table-backed content type by its slug (see modules/content-schema). The
 * owner-designed index template (block_sets `type-template:index:<slug>`) drops
 * this block in; `contentType` is stamped to that type's slug so it resolves the
 * right rows even inside a shared template store.
 */
export const entryListSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Content-type slug (or base path) whose rows to list; empty = the page's own type. */
  contentType: z.string().max(80).default(""),
  limit: z.number().int().min(1).max(100).default(24),
});

export type EntryListContent = z.infer<typeof entryListSchema>;

export const makeEntryList = (): EntryListContent => entryListSchema.parse({});
