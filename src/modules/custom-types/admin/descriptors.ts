import type { FieldDescriptor, FieldKind } from "@/modules/entries/admin/field-descriptors";
import type { FieldDef } from "../validation";

/**
 * Maps a custom type's stored FieldDef[] (16 kinds) onto the entry form's
 * FieldDescriptor shape (6 rendering kinds). Built-in content types keep
 * their hand-written, richer descriptors in entries/admin/fields.tsx
 * untouched — this is the additive path for `custom:<slug>` types only,
 * used when FIELD_DESCRIPTORS[entity] has nothing for a given entity.
 */
const KIND_MAP: Partial<Record<FieldDef["kind"], FieldKind>> = {
  text: "text",
  select: "select",
  tags: "tags",
  number: "number",
  currency: "number",
  boolean: "boolean",
  richtext: "textarea",
};

/** Kinds with no dedicated widget yet — rendered as plain text with an explanatory hint rather than dropped or crashed on. */
const UNSUPPORTED_HINT: Partial<Record<FieldDef["kind"], string>> = {
  date: "ISO date (YYYY-MM-DD)",
  url: "https:// or relative URL",
  email: "Email address",
  color: "Hex color (#rrggbb)",
  file: "Media path or https:// URL",
  image: "Media path or https:// URL",
  reference: "Referenced entry id",
  json: "Raw JSON object",
  repeater: "Repeater fields aren't editable here yet",
};

/**
 * A safe NEW-entry seed value per unsupported kind — see
 * FieldDescriptor.seedValue's doc comment for why this exists at all.
 * custom-types/builder.ts's schemaForField is the source of truth for what
 * each kind's real Zod schema actually accepts:
 *   - file/image and single reference accept "" (their schema explicitly
 *     allows it, or is a bare z.string() with no format constraint)
 *   - date/url/email/color/json are regex- or shape-constrained and reject
 *     "" outright, even when the field is optional
 *   - repeater and multi-reference are arrays, not strings — "" isn't even
 *     the right TYPE, so it's not just a format mismatch
 * `undefined` means "omit the key" (seedData interprets that as "field
 * absent", which every optional field's schema already accepts).
 */
function seedValueFor(f: FieldDef): unknown {
  switch (f.kind) {
    case "file":
    case "image":
      return "";
    case "reference":
      return f.multi ? undefined : "";
    case "repeater":
      return undefined;
    case "date":
    case "url":
    case "email":
    case "color":
    case "json":
      return undefined;
    default:
      return undefined; // supported kinds ignore seedValue — see EntryForm.seedData
  }
}

const UNSUPPORTED_KINDS: ReadonlySet<FieldDef["kind"]> = new Set([
  "date",
  "url",
  "email",
  "color",
  "file",
  "image",
  "reference",
  "json",
  "repeater",
]);

export function descriptorsFromFieldDefs(fields: FieldDef[]): FieldDescriptor[] {
  return fields.map((f) => {
    const kind = KIND_MAP[f.kind] ?? "text";
    const hint = UNSUPPORTED_HINT[f.kind] ?? f.help;
    return {
      key: f.key,
      label: f.label,
      kind,
      options: f.options?.map((o) => [o, o] as [string, string]),
      hint,
      ...(UNSUPPORTED_KINDS.has(f.kind) ? { seedValue: seedValueFor(f) } : {}),
    };
  });
}
