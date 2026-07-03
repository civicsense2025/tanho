import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

const schema = z.object({
  code: z.string().default(""),
  filename: z.string().optional(),
});

export type CodeContent = z.infer<typeof schema>;

export const codeSpec = defineBlock({
  type: "code",
  kind: "content",
  label: "Code",
  category: "text",
  schema,
  defaultContent: {},
});
