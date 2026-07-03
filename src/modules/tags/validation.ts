import { z } from "zod";

/** Tag name: trimmed, 1–40 chars. Normalize before writing/uniqueness checks. */
export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(40, "Tag name must be 40 characters or fewer");

export const createTagSchema = z.object({ name: tagNameSchema });
export const renameTagSchema = z.object({ id: z.string().min(1), name: tagNameSchema });
