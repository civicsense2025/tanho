import { z } from "zod";

/** A slug: lowercase letters, numbers, dashes — safe for a /policies/:slug URL. */
const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

/** Optional ISO-ish date (YYYY-MM-DD) or empty. */
const effectiveDate = z
  .string()
  .max(20)
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD or leave empty")
  .default("");

/** Create/update payload for a policy document. */
export const policyInputSchema = z.object({
  slug,
  title: z.string().min(1).max(200),
  group: z.enum(["site", "store"]).default("site"),
  body: z.string().max(100_000).default(""),
  status: z.enum(["draft", "published"]).default("draft"),
  footerLinked: z.boolean().default(false),
  effectiveDate,
});

export type PolicyInput = z.infer<typeof policyInputSchema>;
