import { z } from "zod";

/** The field kinds a custom content type may declare. */
export const FIELD_KINDS = [
  "text",
  "richtext",
  "number",
  "currency",
  "date",
  "boolean",
  "select",
  "tags",
  "url",
  "email",
  "color",
  "file",
  "image",
  "reference",
  "json",
  "repeater",
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];

/** Reserved keys that enable prototype pollution — never allowed as a field key. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const keySchema = z
  .string()
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/, "Key must be lower snake_case starting with a letter")
  .refine((k) => !FORBIDDEN_KEYS.has(k), "Reserved key is not allowed");

const MAX_FIELDS = 40;
/**
 * Repeater nesting budget: a top-level field may nest repeaters at most
 * MAX_DEPTH levels deep (repeater → repeater → leaf). A third nested
 * repeater is rejected.
 */
const MAX_DEPTH = 2;
const MAX_REPEATER_CHILDREN = 20;

/** A single field definition. Recursive `fields` (repeater) is depth-capped. */
export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  help?: string;
  options?: string[];
  refType?: string;
  multi?: boolean;
  fields?: FieldDef[];
};

/**
 * Build the field-definition schema for a given remaining depth. At depth 0
 * a repeater may not carry nested `fields`, which caps recursion at
 * MAX_DEPTH levels.
 */
function fieldSchemaAtDepth(depth: number): z.ZodType<FieldDef> {
  const base = {
    key: keySchema,
    label: z.string().min(1).max(80),
    kind: z.enum(FIELD_KINDS),
    required: z.boolean().optional(),
    help: z.string().max(200).optional(),
    options: z.array(z.string().min(1).max(80)).max(50).optional(),
    refType: z.string().max(40).optional(),
    multi: z.boolean().optional(),
  };

  if (depth <= 0) {
    return z.object(base).strict() as unknown as z.ZodType<FieldDef>;
  }

  const child = fieldSchemaAtDepth(depth - 1);
  return z
    .object({
      ...base,
      fields: z.array(child).max(MAX_REPEATER_CHILDREN).optional(),
    })
    .strict() as unknown as z.ZodType<FieldDef>;
}

/** One field definition (recursion allowed up to MAX_DEPTH). */
export const fieldDefSchema = fieldSchemaAtDepth(MAX_DEPTH);

/** The whole field list for a custom type — deduped keys, capped count. */
export const fieldListSchema = z
  .array(fieldDefSchema)
  .max(MAX_FIELDS, `A content type may have at most ${MAX_FIELDS} fields`)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    for (const f of fields) {
      if (seen.has(f.key)) {
        ctx.addIssue({ code: "custom", message: `Duplicate field key: ${f.key}` });
      }
      seen.add(f.key);
    }
  });

/** The payload saveCustomType accepts (name → slug is derived server-side). */
export const customTypeInputSchema = z.object({
  slug: z
    .string()
    .max(40)
    .regex(/^[a-z][a-z0-9-]*$/, "Slug must be lower-kebab starting with a letter"),
  name: z.string().min(1).max(80),
  fields: fieldListSchema,
  enabled: z.boolean().default(true),
});

export type CustomTypeInput = z.infer<typeof customTypeInputSchema>;
