import type { FieldDescriptor, FieldKind } from "@/modules/entries/admin/fields";
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
    };
  });
}
