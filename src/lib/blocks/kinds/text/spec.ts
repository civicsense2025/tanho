import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

// `html` defaults to "" so both a freshly-added block ({}) and a legacy row ({html:"..."})
// parse — preserving the old DEFAULT_CONTENT.text ({}) behavior exactly.
const schema = z.object({
  html: z.string().default(""),
});

export type TextContent = z.infer<typeof schema>;

export const textSpec = defineBlock({
  type: "text",
  kind: "content",
  label: "Text",
  category: "text",
  schema,
  defaultContent: {},
  styleCaps: { align: true, width: true, padding: true },
});
