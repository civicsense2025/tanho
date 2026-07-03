import { z } from "zod";
import { commonContent, styleContent } from "../common";

export const listSchema = z.object({
  ...commonContent,
  ...styleContent,
  style: z.enum(["bullet", "number", "check"]).default("bullet"),
  items: z.array(z.string().max(500)).max(50).default([]),
});

export type ListContent = z.infer<typeof listSchema>;

export const makeList = (): ListContent =>
  listSchema.parse({
    style: "bullet",
    items: ["First point", "Second point", "Third point"],
  });
