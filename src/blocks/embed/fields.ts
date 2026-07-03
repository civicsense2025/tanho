import { z } from "zod";
import { commonContent } from "../common";

export const embedSchema = z.object({
  ...commonContent,
  provider: z.enum(["youtube", "figma", "maps"]).default("youtube"),
  url: z.union([z.literal(""), z.string().max(2000).regex(/^https:\/\//)]).default(""),
  ratio: z.enum(["16 / 9", "4 / 3", "1 / 1", "21 / 9"]).default("16 / 9"),
});

export type EmbedContent = z.infer<typeof embedSchema>;

export const makeEmbed = (): EmbedContent =>
  embedSchema.parse({ provider: "youtube", url: "", ratio: "16 / 9" });
