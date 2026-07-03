import { z } from "zod";
import { childBlocksSchema, commonContent } from "../common";

export const containerSchema = z.object({
  ...commonContent,
  maxWidth: z.enum(["content", "prose", "full"]).default("content"),
  blocks: childBlocksSchema.default([]),
});

export type ContainerContent = z.infer<typeof containerSchema>;

export const makeContainer = (): ContainerContent =>
  containerSchema.parse({ maxWidth: "content", blocks: [] });
