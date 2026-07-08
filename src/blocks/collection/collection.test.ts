import { describe, expect, it } from "vitest";
import { blockDef } from "../registry";
import { canNest, CONTAINER_TYPES } from "../tree";
import { makeCollection, collectionSchema } from "./fields";
import { applyCollectionQuery, type CollectionRecord } from "./resolve";

describe("collection block", () => {
  it("is registered, bound, and a container", () => {
    const def = blockDef("collection");
    expect(def).toBeDefined();
    expect(def?.bound).toBe(true);
    expect((CONTAINER_TYPES as readonly string[]).includes("collection")).toBe(true);
  });

  it("makeCollection produces schema-valid default content", () => {
    const content = makeCollection();
    expect(collectionSchema.safeParse(content).success).toBe(true);
    expect(content.source).toEqual({ kind: "entries", entity: "post" });
  });

  it("validates the source discriminated union", () => {
    expect(collectionSchema.safeParse({ source: { kind: "entries", entity: "project" }, limit: 6, blocks: [] }).success).toBe(true);
    expect(collectionSchema.safeParse({ source: { kind: "customType", type: "products" }, limit: 6, blocks: [] }).success).toBe(true);
    // Unknown source kind is rejected.
    expect(collectionSchema.safeParse({ source: { kind: "bogus" }, limit: 6, blocks: [] }).success).toBe(false);
  });

  it("caps limit at 100", () => {
    expect(collectionSchema.safeParse({ source: { kind: "entries", entity: "p" }, limit: 101, blocks: [] }).success).toBe(false);
  });

  it("blocks nested collections and sections in a collection template", () => {
    expect(canNest("collection", "heading")).toBe(true);
    expect(canNest("collection", "collection")).toBe(false);
    expect(canNest("collection", "section")).toBe(false);
  });

  it("applies safe defaults for the new list-query knobs (backward compat)", () => {
    const content = makeCollection();
    expect(content.orderDir).toBe("desc");
    expect(content.offset).toBe(0);
    expect(content.orderBy).toBeUndefined();
    expect(content.filterField).toBeUndefined();
    expect(content.filterValue).toBeUndefined();
    // Existing minimal content (source+limit only) still validates and fills defaults.
    const parsed = collectionSchema.safeParse({
      source: { kind: "entries", entity: "post" },
      limit: 6,
      blocks: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.orderDir).toBe("desc");
      expect(parsed.data.offset).toBe(0);
    }
  });
});

const recs: CollectionRecord[] = [
  { title: "Apple", price: 3, category: "fruit", publishedAt: "2024-01-03" },
  { title: "Banana", price: 1, category: "fruit", publishedAt: "2024-01-01" },
  { title: "Cherry", price: 5, category: "fruit", publishedAt: "2024-01-02" },
  { title: "Donut", price: 2, category: "snack", publishedAt: "2024-01-04" },
];
const q = (opts: Parameters<typeof applyCollectionQuery>[1]) => applyCollectionQuery(recs, opts);

describe("collection query pipeline (filter → sort → offset → limit)", () => {
  it("defaults keep natural order and slice to limit (no filter/sort, offset 0)", () => {
    expect(q({ orderDir: "desc", offset: 0, limit: 6 }).map((r) => r.title)).toEqual([
      "Apple",
      "Banana",
      "Cherry",
      "Donut",
    ]);
    expect(q({ orderDir: "desc", offset: 0, limit: 2 }).map((r) => r.title)).toEqual(["Apple", "Banana"]);
  });

  it("filters by case-insensitive contains; empty filterValue applies no filter", () => {
    expect(q({ filterField: "category", filterValue: "FRUIT", orderDir: "desc", offset: 0, limit: 6 }).map((r) => r.title))
      .toEqual(["Apple", "Banana", "Cherry"]);
    // Empty value → no filter, everything passes.
    expect(q({ filterField: "category", filterValue: "", orderDir: "desc", offset: 0, limit: 6 })).toHaveLength(4);
    // Field set but missing on a record stringifies to "" — won't contain a non-empty needle.
    expect(q({ filterField: "missing", filterValue: "x", orderDir: "desc", offset: 0, limit: 6 })).toHaveLength(0);
  });

  it("sorts strings asc/desc (default desc = reverse alpha here)", () => {
    expect(q({ orderBy: "title", orderDir: "asc", offset: 0, limit: 6 }).map((r) => r.title)).toEqual([
      "Apple",
      "Banana",
      "Cherry",
      "Donut",
    ]);
    expect(q({ orderBy: "title", orderDir: "desc", offset: 0, limit: 6 }).map((r) => r.title)).toEqual([
      "Donut",
      "Cherry",
      "Banana",
      "Apple",
    ]);
  });

  it("sorts numerically when both values are numbers", () => {
    expect(q({ orderBy: "price", orderDir: "asc", offset: 0, limit: 6 }).map((r) => r.title)).toEqual([
      "Banana",
      "Donut",
      "Apple",
      "Cherry",
    ]);
    expect(q({ orderBy: "price", orderDir: "desc", offset: 0, limit: 6 }).map((r) => r.title)).toEqual([
      "Cherry",
      "Apple",
      "Donut",
      "Banana",
    ]);
  });

  it("sorts nullish values to the END regardless of direction", () => {
    const rows: CollectionRecord[] = [
      { title: "A", price: 2 },
      { title: "B", price: undefined },
      { title: "C", price: 1 },
      { title: "D", price: null },
    ];
    const asc = applyCollectionQuery(rows, { orderBy: "price", orderDir: "asc", offset: 0, limit: 6 }).map((r) => r.title);
    const desc = applyCollectionQuery(rows, { orderBy: "price", orderDir: "desc", offset: 0, limit: 6 }).map((r) => r.title);
    // 1, 2 asc → C, A; then nullish (B, D) at the end in their relative order.
    expect(asc).toEqual(["C", "A", "B", "D"]);
    // 2, 1 desc → A, C; nullish still at the end.
    expect(desc).toEqual(["A", "C", "B", "D"]);
  });

  it("applies offset then limit as a window (slice(offset, offset+limit))", () => {
    // Sorted by price asc: Banana(1), Donut(2), Apple(3), Cherry(5).
    expect(q({ orderBy: "price", orderDir: "asc", offset: 1, limit: 2 }).map((r) => r.title)).toEqual([
      "Donut",
      "Apple",
    ]);
  });

  it("runs filter BEFORE sort and offset/limit (pipeline order)", () => {
    // Filter to fruit, sort by price asc, offset 1 limit 1 → Apple(3) after Banana(1).
    const out = q({
      filterField: "category",
      filterValue: "fruit",
      orderBy: "price",
      orderDir: "asc",
      offset: 1,
      limit: 1,
    }).map((r) => r.title);
    expect(out).toEqual(["Apple"]);
  });
});
