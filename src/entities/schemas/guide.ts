import { z } from "zod";
import type { EntitySchema } from "../types";
import { slugRef, slugRefList, tagList } from "./common";

/** A migration guide: how to move from a source platform to a target. */
export const guideDataSchema = z.object({
  tagline: z.string().max(300).default(""),
  summary: z.string().max(500).default(""),
  /** The owning hub's slug (category). */
  category: slugRef.or(z.literal("")).default(""),
  source_platform: slugRef.or(z.literal("")).default(""),
  target_platform: slugRef.or(z.literal("")).default(""),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  effort_hours_min: z.number().min(0).max(500).default(0),
  effort_hours_max: z.number().min(0).max(500).default(0),
  cost_min_usd: z.number().min(0).max(100000).default(0),
  cost_max_usd: z.number().min(0).max(100000).default(0),
  cost_period: z.enum(["mo", "yr", "one-time"]).default("mo"),
  tags: tagList,
  resource_slugs: slugRefList,
  skills_required: z.array(z.string().max(120)).max(30).default([]),
  requirements: z.array(z.string().max(200)).max(30).default([]),
});

export type GuideData = z.infer<typeof guideDataSchema>;

export const guideSchema: EntitySchema<typeof guideDataSchema> = {
  entity: "guide",
  label: "Guide",
  plural: "Guides",
  basePath: "/guides",
  dataSchema: guideDataSchema,
  titleKey: "tagline",
  listColumns: [
    { key: "category", header: "Category", width: "1.2fr" },
    { key: "difficulty", header: "Difficulty", width: "9rem" },
    { key: "status", header: "Status", width: "8rem" },
  ],
};
