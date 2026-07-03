import { z } from "zod";
import { slugSchema } from "@/modules/pages/validation";

/**
 * Structured entry fields (the "DB half"). The `data` record is validated
 * separately against the registered entity schema for the entry's type.
 */
export const entryDetailsSchema = z.object({
  type: z.string().min(1).max(64),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  status: z.enum(["draft", "published"]).default("draft"),
  sortOrder: z.number().default(0),
});

export type EntryDetails = z.infer<typeof entryDetailsSchema>;
