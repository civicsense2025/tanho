import { z } from "zod";
import { commonContent, styleContent } from "../common";

/** Post archive — a list of published posts, newest first. */
export const postlistSchema = z.object({
  ...commonContent,
  ...styleContent,
  limit: z.number().int().min(1).max(50).default(10),
  source: z.literal("posts").default("posts"),
});

export type PostlistContent = z.infer<typeof postlistSchema>;

export const makePostlist = (): PostlistContent => postlistSchema.parse({});
