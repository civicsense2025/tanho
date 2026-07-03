import { profileSectionSchema } from "../profile-section";

export const awardListSchema = profileSectionSchema("awards");

export type AwardListContent = ReturnType<typeof awardListSchema.parse>;

export const makeAwardList = (): AwardListContent =>
  awardListSchema.parse({ source: "awards", eyebrow: "" });
