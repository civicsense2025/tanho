import { profileSectionSchema } from "../profile-section";

export const educationListSchema = profileSectionSchema("education");

export type EducationListContent = ReturnType<typeof educationListSchema.parse>;

export const makeEducationList = (): EducationListContent =>
  educationListSchema.parse({ source: "education", eyebrow: "" });
