import type { BlockDef } from "../types";
import { makeReviews, reviewsSchema } from "./fields";
import { RenderReviews } from "./Render";

export const reviewsDef: BlockDef<typeof reviewsSchema> = {
  type: "reviews",
  category: "dynamic",
  label: "Reviews",
  icon: "rating",
  blurb: "Live reviews & ratings for any product, course, or post",
  schema: reviewsSchema,
  make: makeReviews,
  Render: RenderReviews,
  bound: true,
  suggestedFor: ["*"],
};
