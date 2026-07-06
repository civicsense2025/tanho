import { z } from "zod";
import { childBlocksSchema, commonContent, layoutStyleContent, customCssContent, motionContent } from "../common";

export const containerSchema = z.object({
  ...commonContent,
  ...layoutStyleContent,
  ...customCssContent,
  ...motionContent,
  maxWidth: z.enum(["content", "prose", "full"]).default("content"),
  blocks: childBlocksSchema.default([]),
});

export type ContainerContent = z.infer<typeof containerSchema>;

export const makeContainer = (): ContainerContent =>
  containerSchema.parse({ maxWidth: "content", blocks: [] });
