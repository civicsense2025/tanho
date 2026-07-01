import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineBlock } from "@/lib/blocks/core/defineBlock";
import { blockSpecs, BLOCK_TYPES, getBlockSpec } from "@/lib/blocks/registry";

describe("defineBlock guardrails", () => {
  it("accepts a spec whose defaultContent satisfies the schema", () => {
    const spec = defineBlock({
      type: "t", kind: "content", label: "T",
      schema: z.object({ a: z.string().default("") }),
      defaultContent: {},
    });
    expect(Object.isFrozen(spec)).toBe(true);
  });

  it("throws when defaultContent violates the schema", () => {
    expect(() =>
      defineBlock({
        type: "bad", kind: "content", label: "Bad",
        schema: z.object({ a: z.string() }),
        // @ts-expect-error intentional mismatch
        defaultContent: { a: 123 },
      })
    ).toThrow(/does not satisfy schema/);
  });

  it("throws on duplicate variant ids", () => {
    expect(() =>
      defineBlock({
        type: "dupvar", kind: "content", label: "Dup",
        schema: z.object({}).default({}),
        defaultContent: {},
        variants: [{ id: "x", label: "X" }, { id: "x", label: "X2" }],
      })
    ).toThrow(/duplicate variant id/);
  });
});

describe("block registry", () => {
  it("registers exactly the five content blocks in order", () => {
    expect(BLOCK_TYPES).toEqual(["text", "image", "video", "metric", "gallery"]);
  });

  it("every spec's default content parses (defineBlock enforces this at load)", () => {
    for (const type of BLOCK_TYPES) {
      const spec = blockSpecs[type];
      expect(spec.schema.safeParse(spec.defaultContent).success).toBe(true);
    }
  });

  it("getBlockSpec returns undefined for unknown types", () => {
    expect(getBlockSpec("nope")).toBeUndefined();
    expect(getBlockSpec("text")).toBeDefined();
  });
});
