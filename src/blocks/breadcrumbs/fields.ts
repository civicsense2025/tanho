import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const breadcrumbsSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Prepend a link to the site root. */
  showHome: z.boolean().default(true),
  /** Label for the home crumb. */
  homeLabel: z.string().max(40).default("Home"),
  /** Visual separator between crumbs. */
  separator: z.enum(["slash", "chevron", "dot", "arrow"]).default("chevron"),
  /** Show the current page as the last (non-link) crumb. */
  showCurrent: z.boolean().default(true),
});

export type BreadcrumbsContent = z.infer<typeof breadcrumbsSchema>;

export const makeBreadcrumbs = (): BreadcrumbsContent => breadcrumbsSchema.parse({});
