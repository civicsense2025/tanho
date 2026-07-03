import { z } from "zod";
import { childBlocksSchema, commonContent } from "../common";

export const sectionSchema = z.object({
  ...commonContent,
  width: z.enum(["contained", "full"]).default("contained"),
  background: z.enum(["none", "surface", "tint", "tint2", "ink"]).default("none"),
  py: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
  blocks: childBlocksSchema.default([]),
});

export type SectionContent = z.infer<typeof sectionSchema>;

export const makeSection = (): SectionContent =>
  sectionSchema.parse({ width: "contained", background: "none", py: "lg", blocks: [] });
