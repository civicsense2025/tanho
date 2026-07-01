import type { FieldDef, FieldKind } from "@/lib/db/types";
import { fieldKindToZod, defaultForKind, hasValidOptions } from "./field-kinds";

export interface ParsedEntryData {
  data: Record<string, unknown>;
  errors: Record<string, string>;
}

/**
 * Validates entry data against a content type's field definitions, degrading PER-FIELD (not
 * per-document). Each field is safeParsed independently; a failing field drops to its
 * defaultValue (or null/[] for non-required), a passing field keeps its parsed value. This is
 * stronger than parseBlocks()'s whole-block drop because content-type fields are independently
 * added/removed over a type's lifetime -- one schema change shouldn't invalidate the whole entry.
 */
export function parseEntryData(fields: FieldDef[], raw: unknown): ParsedEntryData {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = input[field.key];
    const schema = fieldKindToZod(field);
    const result = schema.safeParse(value);
    if (result.success) {
      data[field.key] = result.data;
    } else {
      // Degrade this field to its default, not the whole entry.
      data[field.key] = field.defaultValue ?? defaultForKind(field.kind as FieldKind);
      errors[field.key] = result.error.issues.map((i) => i.message).join("; ");
    }
  }
  return { data, errors };
}

/**
 * Validates a content type's field definitions for internal consistency. Runs at content-type
 * SAVE time (admin API route), not at boot -- admin-authored data can't be validated at module
 * load the way defineBlock's compile-time specs can.
 */
export function validateFieldDefs(fields: FieldDef[]): string[] {
  const errors: string[] = [];
  const seenKeys = new Set<string>();
  for (const field of fields) {
    if (!field.key) errors.push("Field key is required");
    if (field.key && seenKeys.has(field.key)) errors.push(`Duplicate field key: ${field.key}`);
    if (field.key) seenKeys.add(field.key);
    if (!field.label) errors.push(`Field ${field.key}: label is required`);
    if (field.kind === "select" && !hasValidOptions(field.options)) {
      errors.push(`Field ${field.key}: select kind requires a non-empty array of up to 200 string options`);
    }
  }
  return errors;
}
