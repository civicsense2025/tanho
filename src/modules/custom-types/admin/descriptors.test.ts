import { describe, expect, it } from "vitest";
import { descriptorsFromFieldDefs } from "./descriptors";
import { buildZodForFields } from "../builder";
import type { FieldDef } from "../validation";

/** Mirrors EntryForm.tsx's seedData for the kinds this module can produce —
 *  kept in sync deliberately (a copy, not an import) so a real regression
 *  in either file's logic shows up as a schema-validation failure below,
 *  not just as "the two files happen to agree." */
function seedData(fields: FieldDef[]): Record<string, unknown> {
  const descriptors = descriptorsFromFieldDefs(fields);
  const out: Record<string, unknown> = {};
  for (const d of descriptors) {
    if ("seedValue" in d) {
      if (d.seedValue !== undefined) out[d.key] = d.seedValue;
    } else if (d.kind === "tags") {
      out[d.key] = [];
    } else if (d.kind === "number") {
      out[d.key] = 0;
    } else if (d.kind === "boolean") {
      out[d.key] = d.key === "is_public";
    } else if (d.kind === "select") {
      out[d.key] = d.options?.[0]?.[0] ?? "";
    } else {
      out[d.key] = "";
    }
  }
  return out;
}

describe("descriptorsFromFieldDefs — unsupported-kind seed values pass real validation", () => {
  const unsupportedFields: FieldDef[] = [
    { key: "publish_date", label: "Publish date", kind: "date" },
    { key: "homepage", label: "Homepage", kind: "url" },
    { key: "contact", label: "Contact", kind: "email" },
    { key: "brand_color", label: "Brand color", kind: "color" },
    { key: "attachment", label: "Attachment", kind: "file" },
    { key: "photo", label: "Photo", kind: "image" },
    { key: "linked_entry", label: "Linked entry", kind: "reference" },
    { key: "linked_entries", label: "Linked entries", kind: "reference", multi: true },
    { key: "metadata", label: "Metadata", kind: "json" },
    { key: "sections", label: "Sections", kind: "repeater", fields: [{ key: "title", label: "Title", kind: "text" }] },
  ];

  it("every unsupported-kind field seeds a value its OWN real Zod schema accepts", () => {
    const seeded = seedData(unsupportedFields);
    const schema = buildZodForFields(unsupportedFields);
    const result = schema.safeParse(seeded);
    if (!result.success) {
      throw new Error(
        `seedData produced a value that fails validation: ${JSON.stringify(seeded)} — ${JSON.stringify(result.error.issues)}`,
      );
    }
    expect(result.success).toBe(true);
  });

  it("file/image/single-reference still seed an empty string (their schema allows it)", () => {
    const seeded = seedData(unsupportedFields);
    expect(seeded.attachment).toBe("");
    expect(seeded.photo).toBe("");
    expect(seeded.linked_entry).toBe("");
  });

  it("date/url/email/color/json/repeater/multi-reference are OMITTED (their schema rejects '')", () => {
    const seeded = seedData(unsupportedFields);
    expect("publish_date" in seeded).toBe(false);
    expect("homepage" in seeded).toBe(false);
    expect("contact" in seeded).toBe(false);
    expect("brand_color" in seeded).toBe(false);
    expect("metadata" in seeded).toBe(false);
    expect("sections" in seeded).toBe(false);
    expect("linked_entries" in seeded).toBe(false);
  });

  it("supported kinds (text/select/tags/number/boolean/richtext) keep seeding via the kind-based default", () => {
    const fields: FieldDef[] = [
      { key: "title", label: "Title", kind: "text" },
      { key: "count", label: "Count", kind: "number" },
      { key: "active", label: "Active", kind: "boolean" },
    ];
    const seeded = seedData(fields);
    expect(seeded).toEqual({ title: "", count: 0, active: false });
  });
});
