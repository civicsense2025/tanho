import type { BlockDef } from "../types";
import { makeReadingProgress, readingProgressSchema } from "./fields";
import { RenderReadingProgress } from "./Render";

export const readingProgressDef: BlockDef<typeof readingProgressSchema> = {
  type: "reading-progress",
  category: "content",
  label: "Reading progress",
  icon: "minus",
  blurb: "Scroll-progress bar for long pages",
  schema: readingProgressSchema,
  make: makeReadingProgress,
  Render: RenderReadingProgress,
};
