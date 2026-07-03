import type { BlockDef } from "../types";
import { makeSkillsList, skillsListSchema } from "./fields";
import { RenderSkillsList } from "./Render";

export const skillsListDef: BlockDef<typeof skillsListSchema> = {
  type: "skills-list",
  category: "dynamic",
  label: "Skills",
  icon: "tag",
  blurb: "Skill groups from your profile",
  schema: skillsListSchema,
  make: makeSkillsList,
  Render: RenderSkillsList,
  bound: true,
};
