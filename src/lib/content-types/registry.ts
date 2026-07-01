import type { FieldKind } from "@/lib/db/types";

export type { FieldDef, FieldKind } from "@/lib/db/types";

/** The fixed palette of field kinds. Composition per type is admin-authored data (ContentType.fields), not compile-time. */
export const FIELD_KINDS: FieldKind[] = [
  "text", "textarea", "richtext", "number", "boolean", "date", "datetime",
  "select", "image", "url", "tags", "reference", "block-list",
];

export interface FieldKindMeta {
  label: string;
  /** Whether this kind stores structured JSON (vs a plain scalar). */
  structured: boolean;
}

export const FIELD_KIND_META: Record<FieldKind, FieldKindMeta> = {
  text: { label: "Text", structured: false },
  textarea: { label: "Textarea", structured: false },
  richtext: { label: "Rich Text", structured: false },
  number: { label: "Number", structured: false },
  boolean: { label: "Boolean", structured: false },
  date: { label: "Date", structured: false },
  datetime: { label: "Date & Time", structured: false },
  select: { label: "Select", structured: false },
  image: { label: "Image", structured: false },
  url: { label: "URL", structured: false },
  tags: { label: "Tags", structured: true },
  reference: { label: "Reference", structured: false },
  "block-list": { label: "Block List", structured: true },
};
