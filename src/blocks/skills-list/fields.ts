import { profileSectionSchema } from "../profile-section";

export const skillsListSchema = profileSectionSchema("skills");

export type SkillsListContent = ReturnType<typeof skillsListSchema.parse>;

export const makeSkillsList = (): SkillsListContent =>
  skillsListSchema.parse({ source: "skills", eyebrow: "" });
