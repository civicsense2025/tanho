import { z } from "zod";
import { commonContent, styleContent } from "../common";

export const projectListSchema = z.object({
  ...commonContent,
  ...styleContent,
  limit: z.number().int().min(1).max(24).default(6),
  eyebrow: z.string().max(60).default(""),
});

export type ProjectListContent = z.infer<typeof projectListSchema>;

export const makeProjectList = (): ProjectListContent =>
  projectListSchema.parse({ limit: 6, eyebrow: "" });
