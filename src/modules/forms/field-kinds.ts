/**
 * The 23 field kinds, grouped into the six palette categories the FormBuilder
 * shows. Order within a category is the palette order. `input` kinds collect a
 * value; `screen` kinds (welcome/statement/ending/heading/paragraph) are
 * presentational — they never appear in a submission's values.
 */
export type FieldCategory =
  | "Text"
  | "Contact"
  | "Choice"
  | "Rating"
  | "Advanced"
  | "Screens";

export type FieldKind =
  // Text
  | "text"
  | "textarea"
  | "number"
  | "date"
  // Contact
  | "email"
  | "phone"
  // Choice
  | "select"
  | "radio"
  | "checkboxes"
  | "yesno"
  | "picture"
  // Rating
  | "rating"
  | "scale"
  | "nps"
  | "ranking"
  // Advanced
  | "file"
  | "signature"
  | "payment"
  // Screens
  | "welcome"
  | "statement"
  | "ending"
  | "heading"
  | "paragraph";

export type FieldKindDef = {
  id: FieldKind;
  label: string;
  category: FieldCategory;
};

/** THE registry of field kinds — the palette and the validator both read it. */
export const FIELD_KINDS: FieldKindDef[] = [
  { id: "text", label: "Short text", category: "Text" },
  { id: "textarea", label: "Long text", category: "Text" },
  { id: "number", label: "Number", category: "Text" },
  { id: "date", label: "Date", category: "Text" },

  { id: "email", label: "Email", category: "Contact" },
  { id: "phone", label: "Phone", category: "Contact" },

  { id: "select", label: "Dropdown", category: "Choice" },
  { id: "radio", label: "Multiple choice", category: "Choice" },
  { id: "checkboxes", label: "Checkboxes", category: "Choice" },
  { id: "yesno", label: "Yes / No", category: "Choice" },
  { id: "picture", label: "Picture choice", category: "Choice" },

  { id: "rating", label: "Rating", category: "Rating" },
  { id: "scale", label: "Opinion scale", category: "Rating" },
  { id: "nps", label: "Net promoter", category: "Rating" },
  { id: "ranking", label: "Ranking", category: "Rating" },

  { id: "file", label: "File upload", category: "Advanced" },
  { id: "signature", label: "Signature", category: "Advanced" },
  { id: "payment", label: "Payment", category: "Advanced" },

  { id: "welcome", label: "Welcome screen", category: "Screens" },
  { id: "statement", label: "Statement", category: "Screens" },
  { id: "ending", label: "Ending screen", category: "Screens" },
  { id: "heading", label: "Heading", category: "Screens" },
  { id: "paragraph", label: "Paragraph", category: "Screens" },
];

export const FIELD_CATEGORIES: FieldCategory[] = [
  "Text",
  "Contact",
  "Choice",
  "Rating",
  "Advanced",
  "Screens",
];

const KIND_SET = new Set<FieldKind>(FIELD_KINDS.map((k) => k.id));
export const isFieldKind = (v: string): v is FieldKind => KIND_SET.has(v as FieldKind);

/** Presentational kinds — never collect a value, never validated as input. */
export const SCREEN_KINDS: ReadonlySet<FieldKind> = new Set<FieldKind>([
  "welcome",
  "statement",
  "ending",
  "heading",
  "paragraph",
]);

/** Kinds whose value is chosen from `options`. */
export const OPTION_KINDS: ReadonlySet<FieldKind> = new Set<FieldKind>([
  "select",
  "radio",
  "checkboxes",
  "picture",
  "ranking",
]);

/** Kinds that may hold multiple values (checkboxes, and multi picture choice). */
export const isScreen = (kind: FieldKind) => SCREEN_KINDS.has(kind);
export const hasOptions = (kind: FieldKind) => OPTION_KINDS.has(kind);

export const kindLabel = (kind: FieldKind): string =>
  FIELD_KINDS.find((k) => k.id === kind)?.label ?? kind;
