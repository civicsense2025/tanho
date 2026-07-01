import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

// Same { html } wrapper convention as the `text` kind -- see that spec's comment. `richtext`
// exists alongside `text`, not as its replacement: `text` stays the zero-overhead raw-HTML
// option for power users, `richtext` is the new TipTap-backed default in the block picker.
const schema = z.object({
  html: z.string().default(""),
});

export type RichtextContent = z.infer<typeof schema>;

export const richtextSpec = defineBlock({
  type: "richtext",
  kind: "content",
  label: "Rich Text",
  category: "text",
  schema,
  defaultContent: {},
  styleCaps: { align: true, width: true, padding: true },
});
