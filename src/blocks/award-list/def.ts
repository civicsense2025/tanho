import type { BlockDef } from "../types";
import { awardListSchema, makeAwardList } from "./fields";
import { RenderAwardList } from "./Render";

export const awardListDef: BlockDef<typeof awardListSchema> = {
  type: "award-list",
  category: "dynamic",
  label: "Awards",
  icon: "award",
  blurb: "Awards from your profile",
  schema: awardListSchema,
  make: makeAwardList,
  Render: RenderAwardList,
  bound: true,
};
