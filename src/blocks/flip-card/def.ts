import type { BlockDef } from "../types";
import { makeFlipCard, flipCardSchema } from "./fields";
import { RenderFlipCard } from "./Render";

export const flipCardDef: BlockDef<typeof flipCardSchema> = {
  type: "flip-card",
  category: "content",
  label: "Flip card",
  icon: "flip-card",
  blurb: "Card that flips to reveal a back face",
  schema: flipCardSchema,
  make: makeFlipCard,
  Render: RenderFlipCard,
};
