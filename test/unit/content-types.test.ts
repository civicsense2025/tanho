import { describe, it, expect } from "vitest";
import { fieldKindToZod, buildEntrySchema, parseEntryData, validateFieldDefs, type FieldDef } from "@/lib/content-types";

describe("fieldKindToZod", () => {
  it("maps text to z.string()", () => {
    const schema = fieldKindToZod({ key: "t", label: "T", kind: "text" });
    expect(schema.safeParse("hello").success).toBe(true);
    expect(schema.safeParse(123).success).toBe(false);
  });

  it("maps number to z.number()", () => {
    const schema = fieldKindToZod({ key: "n", label: "N", kind: "number" });
    expect(schema.safeParse(42).success).toBe(true);
    expect(schema.safeParse("42").success).toBe(false);
  });

  it("maps boolean to 0/1 integer", () => {
    const schema = fieldKindToZod({ key: "b", label: "B", kind: "boolean" });
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(true).success).toBe(false);
  });

  it("maps select to z.enum with options", () => {
    const schema = fieldKindToZod({ key: "s", label: "S", kind: "select", options: ["a", "b", "c"] });
    expect(schema.safeParse("a").success).toBe(true);
    expect(schema.safeParse("d").success).toBe(false);
  });

  it("maps tags to z.array(z.string())", () => {
    const schema = fieldKindToZod({ key: "tags", label: "Tags", kind: "tags" });
    expect(schema.safeParse(["a", "b"]).success).toBe(true);
    expect(schema.safeParse("a").success).toBe(false);
  });

  it("non-required fields default to null for scalars, [] for arrays", () => {
    const textSchema = fieldKindToZod({ key: "t", label: "T", kind: "text" });
    expect(textSchema.safeParse(undefined).data).toBeNull();
    const tagsSchema = fieldKindToZod({ key: "tg", label: "Tg", kind: "tags" });
    expect(tagsSchema.safeParse(undefined).data).toEqual([]);
  });

  it("required fields fail on absent values", () => {
    const schema = fieldKindToZod({ key: "t", label: "T", kind: "text", required: true });
    expect(schema.safeParse(undefined).success).toBe(false);
  });
});

describe("buildEntrySchema", () => {
  it("assembles a z.object from field defs", () => {
    const fields: FieldDef[] = [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "count", label: "Count", kind: "number" },
    ];
    const schema = buildEntrySchema(fields);
    expect(schema.safeParse({ title: "Hello", count: 5 }).success).toBe(true);
    expect(schema.safeParse({ count: 5 }).success).toBe(false); // title required
  });
});

describe("parseEntryData", () => {
  it("degrades per-field, not per-document", () => {
    const fields: FieldDef[] = [
      { key: "title", label: "Title", kind: "text" },
      { key: "count", label: "Count", kind: "number" },
    ];
    const { data, errors } = parseEntryData(fields, { title: "ok", count: "not-a-number" });
    expect(data.title).toBe("ok");
    expect(data.count).toBe(0); // degraded to default
    expect(errors.count).toBeTruthy();
    expect(errors.title).toBeUndefined();
  });

  it("handles missing fields gracefully", () => {
    const fields: FieldDef[] = [
      { key: "title", label: "Title", kind: "text" },
      { key: "tags", label: "Tags", kind: "tags" },
    ];
    const { data } = parseEntryData(fields, { title: "hi" });
    expect(data.title).toBe("hi");
    expect(data.tags).toEqual([]);
  });

  it("handles non-object input", () => {
    const { data } = parseEntryData([{ key: "x", label: "X", kind: "text" }], null);
    expect(data.x).toBeNull();
  });
});

describe("validateFieldDefs", () => {
  it("catches duplicate keys", () => {
    const errors = validateFieldDefs([
      { key: "dup", label: "A", kind: "text" },
      { key: "dup", label: "B", kind: "text" },
    ]);
    expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("catches select without options", () => {
    const errors = validateFieldDefs([{ key: "s", label: "S", kind: "select" }]);
    expect(errors.some((e) => e.includes("select kind requires"))).toBe(true);
  });

  it("catches a string passed as options (type confusion) -- a string also has a truthy .length", () => {
    const errors = validateFieldDefs([
      { key: "s", label: "S", kind: "select", options: "danger" as unknown as string[] },
    ]);
    expect(errors.some((e) => e.includes("select kind requires"))).toBe(true);
  });

  it("catches an oversized options array", () => {
    const errors = validateFieldDefs([
      { key: "s", label: "S", kind: "select", options: Array.from({ length: 201 }, (_, i) => `opt-${i}`) },
    ]);
    expect(errors.some((e) => e.includes("select kind requires"))).toBe(true);
  });

  it("passes for valid field defs", () => {
    const errors = validateFieldDefs([
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "level", label: "Level", kind: "select", options: ["easy", "hard"] },
    ]);
    expect(errors).toEqual([]);
  });
});

describe("fieldKindToZod -- select options defense-in-depth", () => {
  it("falls back to a plain string schema (not a broken enum) when options is a string, not an array", () => {
    // Reproduces the type-confusion bug: z.enum() over a raw string silently iterates its
    // characters into a bogus enum rather than rejecting it. Defense-in-depth here means this
    // can't happen even if a bad FieldDef somehow bypasses validateFieldDefs.
    const schema = fieldKindToZod({ key: "s", label: "S", kind: "select", options: "danger" as unknown as string[] });
    // A real z.enum(["d","a","n","g","e","r"]) would accept "d"; the string-schema fallback
    // accepts any string, so this alone isn't distinguishing -- assert the enum-specific failure
    // mode (rejecting a value outside the bogus per-character set) does NOT happen.
    expect(schema.safeParse("danger").success).toBe(true);
    expect(schema.safeParse("anything at all").success).toBe(true);
  });

  it("falls back to a plain string schema when options exceeds the size cap", () => {
    const huge = Array.from({ length: 201 }, (_, i) => `opt-${i}`);
    const schema = fieldKindToZod({ key: "s", label: "S", kind: "select", options: huge });
    expect(schema.safeParse("not-in-the-list-at-all").success).toBe(true);
  });
});
