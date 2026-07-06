import type { BlockDef } from "../types";
import { jumpToTopSchema, makeJumpToTop } from "./fields";
import { RenderJumpToTop } from "./Render";

export const jumpToTopDef: BlockDef<typeof jumpToTopSchema> = {
  type: "jump-to-top",
  category: "content",
  label: "Jump to top",
  icon: "arrow-up",
  blurb: "Back-to-top button for long pages",
  schema: jumpToTopSchema,
  make: makeJumpToTop,
  Render: RenderJumpToTop,
};
