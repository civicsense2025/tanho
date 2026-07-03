import type { BlockDef } from "../types";
import { educationListSchema, makeEducationList } from "./fields";
import { RenderEducationList } from "./Render";

export const educationListDef: BlockDef<typeof educationListSchema> = {
  type: "education-list",
  category: "dynamic",
  label: "Education",
  icon: "book",
  blurb: "Education from your profile",
  schema: educationListSchema,
  make: makeEducationList,
  Render: RenderEducationList,
  bound: true,
};
