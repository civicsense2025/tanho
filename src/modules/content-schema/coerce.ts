import type { FieldDef } from "@/modules/custom-types/validation";
import type { ContentRow } from "./crud";

/**
 * Coerce a single field value to the storage shape of its `ct_*` column, keyed
 * by the field's kind. Shared by row-actions.ts (admin writes) and imports/
 * runner.ts (bulk import) so both store a field identically — a plain module
 * (NOT "use server") so the CLI-driven runner can import it without pulling in
 * server-action machinery. Keeping this in one place is load-bearing: a second
 * copy drifted once (reference-multi handled in one but not the other), storing
 * the same field two different ways.
 */
export function coerceValue(field: FieldDef, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null;
  switch (field.kind) {
    case "number":
    case "currency":
      return typeof value === "number" ? value : Number(value);
    case "boolean":
      // SQLite stores 0/1; Postgres accepts true/false — pass a boolean and
      // the driver adapts. Coerce common truthy string forms.
      return value === true || value === "true" || value === "on" || value === 1 || value === "1";
    case "tags":
    case "json":
    case "repeater":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      // reference(multi) also lands here if passed as an array → JSON it.
      if (field.kind === "reference" && field.multi && typeof value !== "string") {
        return JSON.stringify(value);
      }
      return String(value);
  }
}

/** Coerce a whole input object to a row's field columns (spine handled by the caller). */
export function rowValuesFromInput(fields: FieldDef[], input: Record<string, unknown>): ContentRow {
  const out: ContentRow = {};
  for (const f of fields) {
    if (f.key in input) out[f.key] = coerceValue(f, input[f.key]);
  }
  return out;
}
