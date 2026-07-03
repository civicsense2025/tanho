import { profileSectionSchema } from "../profile-section";

export const experienceListSchema = profileSectionSchema("experience");

export type ExperienceListContent = ReturnType<typeof experienceListSchema.parse>;

export const makeExperienceList = (): ExperienceListContent =>
  experienceListSchema.parse({ source: "experience", eyebrow: "" });
