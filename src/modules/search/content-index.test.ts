import { describe, expect, it } from "vitest";
import { contentBody, contentDocumentId, type ContentIndexType } from "./index-document";

/**
 * Pure unit tests for the content-row search helpers. Deliberately NOT
 * exercising indexContentRow/the search adapter (that would touch the real
 * libSQL FTS table and race other suites) — the security-relevant logic lives
 * in `contentBody`, which is pure: it decides what text of a row reaches the
 * search index, and a `hidden` field's value must never appear there.
 */
const type: ContentIndexType = {
  id: "t1",
  basePath: "/products",
  titleField: "title",
  slugField: "slug",
  fields: [
    { key: "title", kind: "text" },
    { key: "description", kind: "text" },
    { key: "secret_note", kind: "text", hidden: true },
    { key: "internal_cost", kind: "number", hidden: true },
    { key: "price", kind: "number" }, // non-textish → excluded from body anyway
  ],
};

describe("contentBody — what a content row contributes to the search index", () => {
  it("includes shown text fields", () => {
    const body = contentBody(type, { title: "Blue Widget", description: "A calm blue widget" });
    expect(body).toContain("Blue Widget");
    expect(body).toContain("A calm blue widget");
  });

  it("EXCLUDES hidden field values (never leak an internal note or cost)", () => {
    const body = contentBody(type, {
      title: "Blue Widget",
      description: "A calm blue widget",
      secret_note: "SUPPLIER_XYZ_CONFIDENTIAL",
      internal_cost: 4.2,
    });
    expect(body).not.toContain("SUPPLIER_XYZ_CONFIDENTIAL");
    expect(body).not.toContain("4.2");
  });

  it("excludes non-textish fields (numbers) from the body", () => {
    const body = contentBody(type, { title: "X", price: 19.99 });
    expect(body).not.toContain("19.99");
  });

  it("joins array (tags) values and skips null fields", () => {
    const t: ContentIndexType = {
      ...type,
      fields: [{ key: "tags", kind: "tags" }, { key: "note", kind: "text" }],
    };
    expect(contentBody(t, { tags: ["a", "b"], note: null })).toBe("a b");
  });

  it("contentDocumentId is stable and slug-scoped", () => {
    expect(contentDocumentId("t1", "blue-widget")).toBe("content:t1:blue-widget");
  });
});
