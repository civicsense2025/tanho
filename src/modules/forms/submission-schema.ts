import { z } from "zod";
import { hasOptions, isScreen, type FieldKind } from "./field-kinds";
import { FORM_UPLOAD_KEY_RE } from "./upload-validation";
import type { FormField } from "./validation";

/**
 * Builds the zod schema a visitor's submission must pass — derived entirely
 * from the FORM'S OWN field definitions, never from the client's payload.
 * Unknown fields are stripped (strict object), required fields enforced, and
 * per-kind rules (pattern/min/max, allowed option values) applied server-side.
 * This is the security boundary: the client cannot widen what's accepted.
 */
export function buildSubmissionSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (isScreen(field.kind)) continue; // presentational — no value
    shape[field.id] = fieldValueSchema(field);
  }
  // .strict() rejects any fieldId not in the form definition.
  return z.object(shape).strict();
}

const MAX_TEXT = 5000;

function fieldValueSchema(field: FormField): z.ZodTypeAny {
  let base = baseForKind(field);
  base = applyRequired(base, field);
  return base;
}

function baseForKind(field: FormField): z.ZodTypeAny {
  const kind = field.kind;

  if (hasOptions(kind)) return optionValueSchema(field);

  switch (kind) {
    case "email":
      return z.string().trim().max(320).email();
    case "phone":
      return z
        .string()
        .trim()
        .max(40)
        .regex(/^[0-9+()\-.\s]*$/, "Invalid phone number");
    case "number":
    case "rating":
    case "scale":
    case "nps":
      return numberSchema(field);
    case "date":
      return z
        .string()
        .trim()
        .max(40)
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
        .or(z.literal(""));
    case "yesno":
      return z.enum(["yes", "no"]).or(z.literal(""));
    case "file":
      // Accepts "" (not uploaded) or a storage key WE issued via
      // /api/forms/upload — never an arbitrary client-supplied string.
      return z
        .string()
        .trim()
        .max(300)
        .refine((v) => v === "" || FORM_UPLOAD_KEY_RE.test(v), {
          message: "Invalid file upload",
        });
    case "signature":
      // Accepts "", an uploaded signature-image key, or a typed fallback
      // ("typed:{name}") — never an arbitrary client-supplied string.
      return z
        .string()
        .trim()
        .max(300)
        .refine(
          (v) => v === "" || FORM_UPLOAD_KEY_RE.test(v) || /^typed:.{1,120}$/.test(v),
          { message: "Invalid signature" },
        );
    case "payment":
      // Presence-only marker; the actual charge is a server-created Checkout
      // Session (see modules/forms/payment.ts) keyed off the response id, not
      // this field's value.
      return z.string().trim().max(120);
    case "textarea":
    case "text":
    default:
      return textSchema(field);
  }
}

function textSchema(field: FormField): z.ZodTypeAny {
  let s = z.string().max(MAX_TEXT);
  if (field.pattern) {
    try {
      const re = new RegExp(field.pattern);
      s = s.refine((v) => v === "" || re.test(v), { message: "Invalid format" });
    } catch {
      /* an unparseable admin pattern simply isn't enforced */
    }
  }
  if (typeof field.max === "number") s = s.max(field.max);
  if (typeof field.min === "number") s = s.min(field.min);
  return s;
}

function numberSchema(field: FormField): z.ZodTypeAny {
  let n = z.coerce.number();
  if (typeof field.min === "number") n = n.min(field.min);
  if (typeof field.max === "number") n = n.max(field.max);
  return n.or(z.literal("")); // empty string = not answered (required check catches it)
}

/** Value(s) must be drawn from the field's declared options only. */
function optionValueSchema(field: FormField): z.ZodTypeAny {
  const allowed = field.options.map((o) => o.value || o.label).filter(Boolean);
  const one =
    allowed.length > 0
      ? z.string().refine((v) => v === "" || allowed.includes(v), {
          message: "Choose a valid option",
        })
      : z.string().max(200);

  const multiple = field.multi || field.kind === "checkboxes" || field.kind === "ranking";
  if (multiple) {
    return z
      .array(one)
      .max(field.options.length || 50)
      .default([]);
  }
  return one;
}

/** Enforces `required` while leaving optional fields free to be blank. */
function applyRequired(base: z.ZodTypeAny, field: FormField): z.ZodTypeAny {
  if (!field.required) return base.optional();
  const label = field.label || "This field";
  const isMulti =
    field.multi || field.kind === "checkboxes" || field.kind === "ranking";
  // For multi fields `base` is an array; require at least one selection.
  // For single fields, require a non-empty value.
  return base.refine(
    (v) => (isMulti ? Array.isArray(v) && v.length > 0 : v !== "" && v !== undefined && v !== null),
    { message: `${label} is required` },
  );
}

/** Kinds whose stored value is text vs numeric — used by the pipeline. */
export function isNumericKind(kind: FieldKind): boolean {
  return kind === "number" || kind === "rating" || kind === "scale" || kind === "nps";
}

/**
 * True when a submission is spam per the honeypot: the hidden field is filled.
 * A real browser leaves it empty. Pure, so it's unit-testable without a DB.
 */
export function isHoneypotTripped(honeypotValue: unknown): boolean {
  return typeof honeypotValue === "string" && honeypotValue.trim() !== "";
}

/** Hidden field name — a real user's browser leaves it empty. Kept here (a
 *  plain module) so the client renderer can import it without pulling in the
 *  "use server" submit action. */
export const HONEYPOT_FIELD = "_hp";

/** Result of a form submission, shared by the action and the renderer. */
export type SubmitState =
  | { ok: true; message?: string; redirect?: string }
  | { ok: false; error: string };
