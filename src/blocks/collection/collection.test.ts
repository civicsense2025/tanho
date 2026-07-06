import { describe, expect, it } from "vitest";
import { blockDef } from "../registry";
import { canNest, CONTAINER_TYPES } from "../tree";
import { makeCollection, collectionSchema } from "./fields";

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
});
