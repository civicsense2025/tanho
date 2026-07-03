import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

const schema = z.object({
  url: z.string().default(""),
  caption: z.string().optional(),
  poster: z.string().optional(),
});

export type VideoContent = z.infer<typeof schema>;

export const videoSpec = defineBlock({
  type: "video",
  kind: "content",
  label: "Video",
  category: "media",
  schema,
  defaultContent: {},
});
