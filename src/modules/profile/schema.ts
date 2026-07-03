import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type ExperienceItem = { span: string; role: string; org: string; note: string };
export type SkillGroup = { group: string; items: string[] };
export type AwardItem = { title: string; org: string; year: string; tone: "accent" | "accent2" };
export type EducationItem = { span: string; school: string; degree: string };

/**
 * Singleton résumé/profile record (always id "profile"). Feeds the profile-
 * header hero and the experience/skills/awards/education bound blocks.
 */
export const profile = sqliteTable("profile", {
  id: text("id").primaryKey().default("profile"),
  name: text("name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatarMediaId: text("avatar_media_id"),
  experience: text("experience", { mode: "json" })
    .$type<ExperienceItem[]>()
    .notNull()
    .default([]),
  skills: text("skills", { mode: "json" }).$type<SkillGroup[]>().notNull().default([]),
  awards: text("awards", { mode: "json" }).$type<AwardItem[]>().notNull().default([]),
  education: text("education", { mode: "json" })
    .$type<EducationItem[]>()
    .notNull()
    .default([]),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type ProfileRow = typeof profile.$inferSelect;
