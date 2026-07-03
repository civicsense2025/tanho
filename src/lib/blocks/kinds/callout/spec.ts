import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

// Matches the ad hoc callout shape guide steps already render in src/app/guides/[slug]/page.tsx
// (content.html + content.variant) -- this spec formalizes it into the block registry so guide
// migration doesn't lose fidelity.
const schema = z.object({
  html: z.string().default(""),
  variant: z.enum(["default", "warning", "danger"]).default("default"),
});

export type CalloutContent = z.infer<typeof schema>;

export const calloutSpec = defineBlock({
  type: "callout",
  kind: "content",
  label: "Callout",
  category: "text",
  schema,
  defaultContent: {},
});
