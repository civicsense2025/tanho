import { describe, expect, it } from "vitest";
import { buildZodForFields } from "./builder";
import { fieldListSchema, type FieldDef } from "./validation";

describe("buildZodForFields — happy path", () => {
  const fields: FieldDef[] = [
    { key: "title", label: "Title", kind: "text", required: true },
    { key: "count", label: "Count", kind: "number" },
    { key: "site", label: "Site", kind: "url" },
    { key: "hue", label: "Hue", kind: "color" },
    { key: "topics", label: "Topics", kind: "tags" },
    { key: "mode", label: "Mode", kind: "select", options: ["a", "b"] },
  ];
  const schema = buildZodForFields(fields);

  it("accepts a valid record", () => {
    const res = schema.safeParse({
      title: "Hello",
      count: 3,
      site: "https://example.com",
      hue: "#ff0000",
      topics: ["x", "y"],
      mode: "a",
    });
    expect(res.success).toBe(true);
  });

  it("requires required fields and leaves others optional", () => {
    expect(schema.safeParse({ count: 1 }).success).toBe(false); // title missing
    expect(schema.safeParse({ title: "ok" }).success).toBe(true);
  });

  it("enforces per-kind constraints", () => {
    expect(schema.safeParse({ title: "ok", hue: "red" }).success).toBe(false);
    expect(schema.safeParse({ title: "ok", mode: "z" }).success).toBe(false);
    expect(schema.safeParse({ title: "ok", site: "ftp://x" }).success).toBe(false);
  });
});

describe("json field rejects prototype-pollution keys", () => {
  const schema = buildZodForFields([{ key: "meta", label: "Meta", kind: "json", required: true }]);

  it("accepts a clean object", () => {
    expect(schema.safeParse({ meta: { a: 1 } }).success).toBe(true);
  });

  it("rejects __proto__ / constructor / prototype keys", () => {
    expect(schema.safeParse({ meta: JSON.parse('{"__proto__": 1}') }).success).toBe(false);
    expect(schema.safeParse({ meta: { constructor: 1 } }).success).toBe(false);
    expect(schema.safeParse({ meta: { prototype: 1 } }).success).toBe(false);
  });
});

describe("meta-schema field-key rejection", () => {
  it("rejects a field named __proto__", () => {
    const res = fieldListSchema.safeParse([{ key: "__proto__", label: "X", kind: "text" }]);
    expect(res.success).toBe(false);
  });

  it("rejects constructor / prototype keys", () => {
    expect(fieldListSchema.safeParse([{ key: "constructor", label: "X", kind: "text" }]).success).toBe(false);
    expect(fieldListSchema.safeParse([{ key: "prototype", label: "X", kind: "text" }]).success).toBe(false);
  });
});

describe("repeater nesting and depth cap", () => {
  it("builds a nested array schema for a repeater", () => {
    const schema = buildZodForFields([
      {
        key: "rows",
        label: "Rows",
        kind: "repeater",
        required: true,
        fields: [{ key: "name", label: "Name", kind: "text", required: true }],
      },
    ]);
    expect(schema.safeParse({ rows: [{ name: "a" }, { name: "b" }] }).success).toBe(true);
    expect(schema.safeParse({ rows: [{}] }).success).toBe(false); // name required
  });

  it("caps repeater nesting at depth 3 in the meta-schema", () => {
    // depth 1
    const d1: FieldDef = { key: "a", label: "A", kind: "text" };
    // depth 3 (allowed): repeater > repeater > text
    const depth3: FieldDef = {
      key: "l1",
      label: "L1",
      kind: "repeater",
      fields: [{ key: "l2", label: "L2", kind: "repeater", fields: [d1] }],
    };
    expect(fieldListSchema.safeParse([depth3]).success).toBe(true);

    // depth 4 (rejected): repeater > repeater > repeater > text
    const depth4: FieldDef = {
      key: "l1",
      label: "L1",
      kind: "repeater",
      fields: [
        {
          key: "l2",
          label: "L2",
          kind: "repeater",
          fields: [{ key: "l3", label: "L3", kind: "repeater", fields: [d1] }],
        },
      ],
    };
    expect(fieldListSchema.safeParse([depth4]).success).toBe(false);
  });
});
