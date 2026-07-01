import { z } from "zod";
import type { FieldDef, FieldKind } from "@/lib/db/types";

/** The raw Zod type for a kind, before required/nullable/default wrapping. */
function baseSchemaForKind(field: FieldDef): z.ZodTypeAny {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "richtext":
    case "url":
    case "date":
    case "datetime":
    case "image":
    case "reference":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      // Stored as 0/1 in SQL, matching the site-wide noIndex convention.
      return z.number().int().min(0).max(1);
    case "select":
      return field.options && field.options.length > 0
        ? z.enum(field.options as [string, ...string[]])
        : z.string();
    case "tags":
      return z.array(z.string());
    case "block-list":
      // Structural schema only -- parseBlocks() does the real per-block validation against
      // the block registry specs at render time.
      return z.array(
        z.object({
          type: z.string(),
          content: z.record(z.string(), z.unknown()),
          sortOrder: z.number().optional(),
        })
      );
    default:
      return z.unknown();
  }
}

/** Default value for a kind, used when a field is absent or fails per-field validation. */
export function defaultForKind(kind: FieldKind): unknown {
  switch (kind) {
    case "tags":
    case "block-list":
      return [];
    case "boolean":
    case "number":
      return 0;
    default:
      return null;
  }
}

/**
 * Maps a FieldDef to its Zod schema. Required fields return the bare type (absent/invalid values
 * fail, which parseEntryData catches and degrades). Non-required fields wrap in .nullable()
 * (SQL nulls) and .default() (absent keys) so they always parse successfully.
 */
export function fieldKindToZod(field: FieldDef): z.ZodTypeAny {
  const base = baseSchemaForKind(field);
  if (field.required) {
    return base;
  }
  return base.nullable().default(field.defaultValue ?? defaultForKind(field.kind));
}

/**
 * Assembles a z.object() from a content type's field definitions. Required fields are required
 * keys (wrapped .nullable() for SQL nullability); non-required fields are optional (the .default()
 * from fieldKindToZod makes them optional in the object schema).
 */
export function buildEntrySchema(fields: FieldDef[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const schema = fieldKindToZod(field);
    shape[field.key] = field.required ? schema.nullable() : schema;
  }
  return z.object(shape);
}
