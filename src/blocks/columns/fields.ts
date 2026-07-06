import { z } from "zod";
import { childBlocksSchema, commonContent, layoutStyleContent, customCssContent, motionContent } from "../common";

export const columnsSchema = z.object({
  ...commonContent,
  ...layoutStyleContent,
  ...customCssContent,
  ...motionContent,
  cols: z.number().int().min(2).max(4).default(3),
  stackAt: z.enum(["mobile", "tablet"]).default("mobile"),
  blocks: childBlocksSchema.default([]),
});

export type ColumnsContent = z.infer<typeof columnsSchema>;

export const makeColumns = (): ColumnsContent =>
  columnsSchema.parse({ cols: 3, stackAt: "mobile", blocks: [] });
