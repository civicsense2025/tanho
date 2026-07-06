import { describe, expect, it } from "vitest";
import type { BlockNode } from "@/blocks/types";
import { starterDetailTemplate } from "./starter-templates";

type FieldContent = { field?: string; display?: string; level?: string; prefix?: string };
const fc = (b: BlockNode) => b.content as FieldContent;

describe("starterDetailTemplate", () => {
  const fields = [
    { key: "title", label: "Title", kind: "text" },
    { key: "price", label: "Price", kind: "currency" },
    { key: "description", label: "Description", kind: "text" },
    { key: "sku", label: "SKU", kind: "text" },
  ];

  it("leads with the title as an H1 field block", () => {
    const t = starterDetailTemplate(fields, "title", "slug");
    expect(t[0]!.type).toBe("field");
    expect(fc(t[0]!)).toMatchObject({ field: "title", display: "heading", level: "h1" });
  });

  it("renders a currency field as a prefixed heading", () => {
    const t = starterDetailTemplate(fields, "title", "slug");
    const price = t.find((b) => fc(b).field === "price")!;
    expect(fc(price)).toMatchObject({ display: "heading", prefix: "$" });
  });

  it("renders a long-text field (description) as plain text", () => {
    const t = starterDetailTemplate(fields, "title", "slug");
    expect(fc(t.find((b) => fc(b).field === "description")!).display).toBe("auto");
  });

  it("renders a plain field (sku) as label-value", () => {
    const t = starterDetailTemplate(fields, "title", "slug");
    expect(fc(t.find((b) => fc(b).field === "sku")!).display).toBe("label-value");
  });

  it("skips the title and slug columns from the body rows", () => {
    const withSlug = [...fields, { key: "slug", label: "Slug", kind: "text" }];
    const t = starterDetailTemplate(withSlug, "title", "slug");
    // title appears exactly once (as the H1), slug never as a body field
    expect(t.filter((b) => fc(b).field === "title")).toHaveLength(1);
    expect(t.filter((b) => fc(b).field === "slug")).toHaveLength(0);
  });

  it("every block is a real `field` block with a fresh id", () => {
    const t = starterDetailTemplate(fields, "title", "slug");
    expect(t.every((b) => b.type === "field" && typeof b.id === "string" && b.id.length > 0)).toBe(true);
    expect(new Set(t.map((b) => b.id)).size).toBe(t.length); // unique ids
  });
});
