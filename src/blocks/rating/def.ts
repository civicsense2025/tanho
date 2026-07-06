import type { BlockDef } from "../types";
import { makeRating, ratingSchema } from "./fields";
import { RenderRating } from "./Render";

export const ratingDef: BlockDef<typeof ratingSchema> = {
  type: "rating",
  category: "content",
  label: "Rating",
  icon: "rating",
  blurb: "Static star rating — reviews, scores",
  schema: ratingSchema,
  make: makeRating,
  Render: RenderRating,
};
