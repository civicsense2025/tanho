import { z } from "zod";
import { commonContent } from "../common";

/**
 * Header/footer search box — a plain GET form to /search (see
 * app/(public)/search/page.tsx). No server action, no client JS needed: a
 * native form submission is genuinely simpler and more correct here than a
 * client-island (unlike newsletter's SubscribeForm, which needs inline
 * pending/error state from a real mutation — search is pure navigation).
 */
export const searchTriggerSchema = z.object({
  ...commonContent,
  placeholder: z.string().max(80).default("Search…"),
  ariaLabel: z.string().max(60).default("Search the site"),
});

export type SearchTriggerContent = z.infer<typeof searchTriggerSchema>;

export const makeSearchTrigger = (): SearchTriggerContent =>
  searchTriggerSchema.parse({});
