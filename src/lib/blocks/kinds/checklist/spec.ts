import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

const schema = z.object({
  items: z.array(z.string()).default([]),
});

export type ChecklistContent = z.infer<typeof schema>;

export const checklistSpec = defineBlock({
  type: "checklist",
  kind: "content",
  label: "Checklist",
  category: "text",
  schema,
  defaultContent: { items: [] },
  styleCaps: { align: true, width: true, padding: true },
});
