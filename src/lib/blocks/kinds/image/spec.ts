import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

// url defaults to "" so the old DEFAULT_CONTENT.image ({}) still parses; caption stays optional.
const schema = z.object({
  url: z.string().default(""),
  caption: z.string().optional(),
});

export type ImageContent = z.infer<typeof schema>;

export const imageSpec = defineBlock({
  type: "image",
  kind: "content",
  label: "Image",
  category: "media",
  schema,
  defaultContent: {},
});
