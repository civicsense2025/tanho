import { z } from "zod";

export const experienceItemSchema = z.object({
  span: z.string().max(60).default(""),
  role: z.string().max(160).default(""),
  org: z.string().max(160).default(""),
  note: z.string().max(300).default(""),
});

export const skillGroupSchema = z.object({
  group: z.string().max(80).default(""),
  items: z.array(z.string().max(60)).max(40).default([]),
});

export const awardItemSchema = z.object({
  title: z.string().max(160).default(""),
  org: z.string().max(160).default(""),
  year: z.string().max(10).default(""),
  tone: z.enum(["accent", "accent2"]).default("accent"),
});

export const educationItemSchema = z.object({
  span: z.string().max(60).default(""),
  school: z.string().max(160).default(""),
  degree: z.string().max(160).default(""),
});

/** The full editable profile payload. `avatarMediaId` is a media row id or null. */
export const profileSchema = z.object({
  name: z.string().max(120).default(""),
  bio: z.string().max(2000).default(""),
  avatarMediaId: z.string().nullable().default(null),
  experience: z.array(experienceItemSchema).max(50).default([]),
  skills: z.array(skillGroupSchema).max(30).default([]),
  awards: z.array(awardItemSchema).max(50).default([]),
  education: z.array(educationItemSchema).max(30).default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const PROFILE_DEFAULTS: ProfileInput = profileSchema.parse({});
