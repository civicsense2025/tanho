import type { BlockDef } from "../types";
import { makeRelatedContent, relatedContentSchema } from "./fields";
import { RenderRelatedContent } from "./Render";

export const relatedContentDef: BlockDef<typeof relatedContentSchema> = {
  type: "related-content",
  category: "dynamic",
  label: "Related content",
  icon: "grid",
  blurb: "Cards linking to entries of a content type",
  schema: relatedContentSchema,
  make: makeRelatedContent,
  Render: RenderRelatedContent,
  bound: true,
};
