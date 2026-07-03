import { z } from "zod";
import type { FieldDef } from "./validation";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HTTPS_OR_RELATIVE = /^(https:\/\/\S+|\/\S*)$/;
const MEDIA_OR_HTTPS = /^(\/api\/media\/|https:\/\/)/;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** True when a value is a plain object carrying no prototype-pollution key. */
function hasNoProtoKey(v: unknown): boolean {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  // Check own keys AND the special `__proto__` (which JSON.parse may set as
  // an own property) before zod's record parser silently drops it.
  for (const k of Object.getOwnPropertyNames(v)) {
    if (FORBIDDEN_KEYS.has(k)) return false;
  }
  return true;
}

/**
 * z.record whose keys reject prototype-pollution vectors. The refine runs
 * on the RAW input first — zod's record parser strips `__proto__` on parse,
 * so the check must see the input before that happens.
 */
const safeJsonRecord = z
  .custom<Record<string, unknown>>(hasNoProtoKey, "Object keys may not be prototype-pollution keys")
  .pipe(z.record(z.string(), z.unknown()));

/** Zod schema for one field's value. Repeaters recurse into their children. */
function schemaForField(field: FieldDef): z.ZodTypeAny {
  switch (field.kind) {
    case "text":
      return z.string().max(10_000);
    case "richtext":
      return z.string().max(100_000);
    case "number":
    case "currency":
      return z.number();
    case "date":
      return z.string().regex(ISO_DATE, "Must be an ISO date");
    case "boolean":
      return z.boolean();
    case "select":
      return field.options?.length
        ? z.enum(field.options as [string, ...string[]])
        : z.string();
    case "tags":
      return z.array(z.string().min(1).max(80)).max(50);
    case "url":
      return z.string().regex(HTTPS_OR_RELATIVE, "Must be an https:// or relative URL");
    case "email":
      return z.email();
    case "color":
      return z.string().regex(HEX_COLOR, "Must be a hex color");
    case "file":
    case "image":
      return z
        .string()
        .refine(
          (v) => v === "" || MEDIA_OR_HTTPS.test(v),
          "Must be a media path or https:// URL",
        );
    case "reference":
      return field.multi ? z.array(z.string()).max(200) : z.string();
    case "json":
      return safeJsonRecord;
    case "repeater":
      return z.array(buildZodForFields(field.fields ?? [])).max(100);
    default:
      return z.unknown();
  }
}

/**
 * Build a zod object validating an entry's data against a VALIDATED field
 * list (run it through fieldListSchema first). Non-required fields are
 * optional; required fields must be present.
 */
export function buildZodForFields(fields: FieldDef[]): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (FORBIDDEN_KEYS.has(field.key)) continue;
    const value = schemaForField(field);
    shape[field.key] = field.required ? value : value.optional();
  }
  return z.object(shape);
}
