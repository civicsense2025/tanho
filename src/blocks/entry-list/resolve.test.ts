import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const listPublishedTypeRows = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: { query: { customTypes: { findFirst: (...a: unknown[]) => findFirst(...a) } } },
}));
vi.mock("@/modules/content-schema/queries", () => ({
  listPublishedTypeRows: (...a: unknown[]) => listPublishedTypeRows(...a),
}));

import { resolveEntryList } from "./resolve";
import { makeEntryList } from "./fields";

const publishedType = {
  id: "t1",
  slug: "products",
  basePath: "/products",
  tableName: "ct_products",
  status: "published",
  titleField: "title",
  slugField: "slug",
  fields: [
    { key: "price", label: "Price", kind: "currency" },
    { key: "blurb", label: "Blurb", kind: "text" },
  ],
};

beforeEach(() => {
  findFirst.mockReset();
  listPublishedTypeRows.mockReset();
});

describe("resolveEntryList", () => {
  it("returns [] when no content type is bound", async () => {
    const items = await resolveEntryList({ ...makeEntryList(), contentType: "" });
    expect(items).toEqual([]);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("maps published rows to card items linking to {base}/{slug}", async () => {
    findFirst.mockResolvedValue(publishedType);
    listPublishedTypeRows.mockResolvedValue([
      { slug: "widget", title: "Widget", price: 9, blurb: "A widget" },
      { slug: "gadget", title: "Gadget", price: 5, blurb: "A gadget" },
    ]);

    const items = await resolveEntryList({ ...makeEntryList(), contentType: "products" });
    expect(items).toEqual([
      { href: "/products/widget", title: "Widget", subtitle: "9" },
      { href: "/products/gadget", title: "Gadget", subtitle: "5" },
    ]);
  });

  it("returns [] when the bound type is not published/table-backed", async () => {
    findFirst.mockResolvedValue(undefined);
    const items = await resolveEntryList({ ...makeEntryList(), contentType: "drafttype" });
    expect(items).toEqual([]);
    expect(listPublishedTypeRows).not.toHaveBeenCalled();
  });

  it("honors the limit", async () => {
    findFirst.mockResolvedValue(publishedType);
    listPublishedTypeRows.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ slug: `s${i}`, title: `T${i}`, price: i })),
    );
    const items = await resolveEntryList({ ...makeEntryList(), contentType: "products", limit: 2 });
    expect(items).toHaveLength(2);
    expect(items[0]!.href).toBe("/products/s0");
  });

  it("falls back to slug for the title when the title field is empty", async () => {
    findFirst.mockResolvedValue(publishedType);
    listPublishedTypeRows.mockResolvedValue([{ slug: "only-slug", title: "", price: null }]);
    const items = await resolveEntryList({ ...makeEntryList(), contentType: "products" });
    expect(items[0]).toEqual({ href: "/products/only-slug", title: "only-slug", subtitle: "" });
  });
});
