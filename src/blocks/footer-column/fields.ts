import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * A titled footer link column, resolved from a saved menu (by id). Replaces one
 * entry of the footer config's `columns[]`. A **bound** block.
 */
export const footerColumnSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  title: z.string().max(40).default(""),
  /** Menu whose items (and their children) become the column links. */
  menuId: z.string().max(64).default(""),
});

export type FooterColumnContent = z.infer<typeof footerColumnSchema>;

export const makeFooterColumn = (): FooterColumnContent =>
  footerColumnSchema.parse({ title: "", menuId: "" });
