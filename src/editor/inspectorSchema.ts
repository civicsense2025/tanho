import type { z } from "zod";
import { categories } from "@/blocks/registry";

const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

/** Unwrap ZodDefault/ZodOptional/ZodNullable wrappers to reach the inner type
 *  (e.g. z.enum(...).default(...) wraps the enum in ZodDefault). */
function unwrapZod(field: unknown): unknown {
  let f = field;
  for (let i = 0; i < 5; i++) {
    const inner = (f as { _def?: { innerType?: unknown } })._def?.innerType;
    if (inner === undefined) break;
    f = inner;
  }
  return f;
}

/** Extract enum options from a zod schema shape entry, if it's a ZodEnum.
 *  Used to render Select dropdowns (e.g. heading level/align) instead of
 *  free-text inputs for fields defined as zod enums. Handles .default()/
 *  .optional()/.nullable() wrappers that hide the inner ZodEnum. */
function enumOptionsOf(schema: z.ZodType, key: string): readonly string[] | undefined {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) return undefined;
  const field = unwrapZod(shape[key]);
  if (field === undefined) return undefined;
  const opts = (field as { options?: readonly unknown[] }).options;
  if (Array.isArray(opts)) return opts as readonly string[];
  // Zod 3 / older API stored values in _def.values
  const defVals = (field as { _def?: { values?: readonly unknown[] } })._def?.values;
  if (Array.isArray(defVals)) return defVals as readonly string[];
  return undefined;
}

/** For array-typed fields (e.g. buttons.items), extract the item schema's
 *  enum options so nested array items render Select dropdowns for their enum
 *  fields. Returns a map of itemKey → enumOptions, or undefined if the field
 *  isn't an array of objects with enum fields. */
function itemEnumOptionsOf(schema: z.ZodType, key: string): Record<string, readonly string[]> | undefined {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) return undefined;
  const field = unwrapZod(shape[key]);
  // ZodArray exposes .element or _def.type; unwrap to the item schema (ZodObject).
  const element = (field as { element?: unknown }).element
    ?? (field as { _def?: { type?: unknown } })._def?.type;
  if (!element) return undefined;
  const itemShape = (element as { shape?: Record<string, unknown> }).shape;
  if (!itemShape) return undefined;
  const map: Record<string, readonly string[]> = {};
  let hasAny = false;
  for (const itemKey of Object.keys(itemShape)) {
    const opts = enumOptionsOf(element as z.ZodType, itemKey);
    if (opts) {
      map[itemKey] = opts;
      hasAny = true;
    }
  }
  return hasAny ? map : undefined;
}

export { catLabel, unwrapZod, enumOptionsOf, itemEnumOptionsOf };
