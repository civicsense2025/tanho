import type { BlockDef } from "../types";
import { makeEntryList, entryListSchema } from "./fields";
import { RenderEntryList } from "./Render";

export const entryListDef: BlockDef<typeof entryListSchema> = {
  type: "entry-list",
  category: "dynamic",
  label: "Entry list",
  icon: "list",
  blurb: "Live rows of a content type as cards",
  schema: entryListSchema,
  make: makeEntryList,
  Render: RenderEntryList,
  bound: true,
  suggestedFor: ["*"],
};
