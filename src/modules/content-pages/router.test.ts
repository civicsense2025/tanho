import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TableBackedType } from "@/modules/content-schema/queries";

const getPublishedTypeByBase = vi.fn();
const listPublishedTypeRows = vi.fn();
const getPublishedTypeRowByPath = vi.fn();

vi.mock("@/modules/content-schema/queries", () => ({
  getPublishedTypeByBase: (...a: unknown[]) => getPublishedTypeByBase(...a),
  listPublishedTypeRows: (...a: unknown[]) => listPublishedTypeRows(...a),
  getPublishedTypeRowByPath: (...a: unknown[]) => getPublishedTypeRowByPath(...a),
}));

import { resolveContentTypeRoute } from "./router";

const type = {
  id: "t1",
  slug: "products",
  basePath: "/products",
  tableName: "ct_products",
  titleField: "title",
  slugField: "slug",
  name: "Product",
  pluralName: "Products",
  fields: [],
} as unknown as TableBackedType;

beforeEach(() => {
  getPublishedTypeByBase.mockReset();
  listPublishedTypeRows.mockReset();
  getPublishedTypeRowByPath.mockReset();
});

describe("resolveContentTypeRoute", () => {
  it("resolves /{base} to an index with its rows", async () => {
    getPublishedTypeByBase.mockResolvedValue(type);
    listPublishedTypeRows.mockResolvedValue([{ slug: "a" }, { slug: "b" }]);

    const r = await resolveContentTypeRoute("/products");
    expect(getPublishedTypeByBase).toHaveBeenCalledWith("/products");
    expect(r).toEqual({ kind: "content-index", type, rows: [{ slug: "a" }, { slug: "b" }] });
  });

  it("resolves /{base}/{slug} to a detail, looked up by full path", async () => {
    getPublishedTypeByBase.mockResolvedValue(type);
    getPublishedTypeRowByPath.mockResolvedValue({ slug: "widget", title: "Widget" });

    const r = await resolveContentTypeRoute("/products/widget");
    expect(getPublishedTypeRowByPath).toHaveBeenCalledWith(type, "/products/widget");
    expect(r).toEqual({ kind: "content-detail", type, row: { slug: "widget", title: "Widget" } });
  });

  it("resolves a DEEPLY nested item by its full path (unbounded depth)", async () => {
    getPublishedTypeByBase.mockResolvedValue(type);
    getPublishedTypeRowByPath.mockResolvedValue({ slug: "cake", title: "Cake" });

    const r = await resolveContentTypeRoute("/products/desserts/frozen/cake");
    // The type still owns the first segment; the row is matched by the whole path.
    expect(getPublishedTypeByBase).toHaveBeenCalledWith("/products");
    expect(getPublishedTypeRowByPath).toHaveBeenCalledWith(type, "/products/desserts/frozen/cake");
    expect(r).toEqual({ kind: "content-detail", type, row: { slug: "cake", title: "Cake" } });
  });

  it("returns null when no type owns the base", async () => {
    getPublishedTypeByBase.mockResolvedValue(null);
    expect(await resolveContentTypeRoute("/nope")).toBeNull();
    expect(listPublishedTypeRows).not.toHaveBeenCalled();
  });

  it("returns null when no row matches the path", async () => {
    getPublishedTypeByBase.mockResolvedValue(type);
    getPublishedTypeRowByPath.mockResolvedValue(null);
    expect(await resolveContentTypeRoute("/products/ghost")).toBeNull();
  });

  it("returns null for the empty route (no segments)", async () => {
    expect(await resolveContentTypeRoute("/")).toBeNull();
    expect(getPublishedTypeByBase).not.toHaveBeenCalled();
  });
});
