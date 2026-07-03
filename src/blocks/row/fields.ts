import { z } from "zod";
import { childBlocksSchema, commonContent } from "../common";

export const rowSchema = z.object({
  ...commonContent,
  cols: z.number().int().min(2).max(4).default(2),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
  align: z.enum(["start", "center", "stretch"]).default("stretch"),
  blocks: childBlocksSchema.default([]),
});

export type RowContent = z.infer<typeof rowSchema>;

export const makeRow = (): RowContent =>
  rowSchema.parse({ cols: 2, gap: "md", align: "stretch", blocks: [] });
