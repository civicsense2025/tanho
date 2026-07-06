import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * The form block embeds a published form by id. It's a BOUND block: resolve()
 * loads the form server-side (only if published); Render stays pure. An unset
 * or unpublished form shows a neutral placeholder.
 */
export const formBlockSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** The form to embed. Empty = placeholder. */
  formId: z.string().max(60).default(""),
});

export type FormBlockContent = z.infer<typeof formBlockSchema>;

export const makeFormBlock = (): FormBlockContent =>
  formBlockSchema.parse({ formId: "" });
