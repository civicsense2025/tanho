import { z } from "zod";
import { commonContent } from "../common";

export const readingProgressSchema = z.object({
  ...commonContent,
  /** Where the bar sits. `top`/`bottom` are fixed to the viewport edge;
   *  `under-header` is fixed just below a sticky header (--header-height). */
  position: z.enum(["top", "under-header", "bottom"]).default("top"),
  /** Bar thickness. */
  thickness: z.enum(["thin", "medium", "thick"]).default("thin"),
  /** Fill colour — semantic tokens only. */
  color: z.enum(["accent", "accent-2", "ink"]).default("accent"),
});

export type ReadingProgressContent = z.infer<typeof readingProgressSchema>;

export const makeReadingProgress = (): ReadingProgressContent =>
  readingProgressSchema.parse({});
