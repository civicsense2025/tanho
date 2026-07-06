import type { BlockDef } from "../types";
import { searchTriggerSchema, makeSearchTrigger } from "./fields";
import { RenderSearchTrigger } from "./Render";

export const searchTriggerDef: BlockDef<typeof searchTriggerSchema> = {
  type: "search-trigger",
  category: "chrome",
  label: "Search",
  icon: "search",
  blurb: "Header or footer search box, links to /search",
  schema: searchTriggerSchema,
  make: makeSearchTrigger,
  Render: RenderSearchTrigger,
};
