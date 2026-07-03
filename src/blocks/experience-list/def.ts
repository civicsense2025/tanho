import type { BlockDef } from "../types";
import { experienceListSchema, makeExperienceList } from "./fields";
import { RenderExperienceList } from "./Render";

export const experienceListDef: BlockDef<typeof experienceListSchema> = {
  type: "experience-list",
  category: "dynamic",
  label: "Experience",
  icon: "briefcase",
  blurb: "Experience rows from your profile",
  schema: experienceListSchema,
  make: makeExperienceList,
  Render: RenderExperienceList,
  bound: true,
};
