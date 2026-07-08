import { describe, expect, it } from "vitest";
import { validatePackTree, treeReferencedTypes } from "@/modules/pages/blocks-io";
import {
  PACK_FORMAT,
  exportBlockPackJson,
  exportDesignPackJson,
  importPackJson,
} from "./portable";
import { THEME_DEFAULTS } from "@/modules/theme/validation";

const validTheme = THEME_DEFAULTS;

const heading = { id: "b1", type: "heading", content: { text: "Hello", level: "h2", align: "left" } };
const unknown = { id: "b2", type: "future-block", content: { whatever: true } };
// heading with invalid content (level out of enum) — known type, bad content
const badHeading = { id: "b3", type: "heading", content: { text: "x", level: "h9", align: "left" } };

describe("portable pack — importPackJson", () => {
  it("rejects a non-pack payload", () => {
    expect(importPackJson({ foo: 1 }).ok).toBe(false);
    expect(importPackJson(null).ok).toBe(false);
  });

  it("rejects an unsupported format tag (fail-closed)", () => {
    const res = importPackJson({ format: "lamina-pack@9", kind: "block-pack", name: "x", blocks: [] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain(PACK_FORMAT);
  });

  it("rejects a block pack missing its tree", () => {
    const res = importPackJson({ format: PACK_FORMAT, kind: "block-pack", name: "x" });
    expect(res.ok).toBe(false);
  });

  it("accepts a valid block pack and preserves unknown types in the shape-validated tree", () => {
    const res = importPackJson({
      format: PACK_FORMAT,
      kind: "block-pack",
      name: "Hero pack",
      blocks: [heading, unknown],
      requiredBlockTypes: ["heading", "future-block"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.name).toBe("Hero pack");
      expect(res.blocks).toHaveLength(2);
      expect(res.requiredBlockTypes).toEqual(["heading", "future-block"]);
    }
  });

  it("rejects a design pack with an invalid theme", () => {
    const res = importPackJson({
      format: PACK_FORMAT,
      kind: "design-pack",
      name: "x",
      theme: { accent: "not-a-hex" },
      pages: [{ name: "Home", blockTree: [] }],
    });
    expect(res.ok).toBe(false);
  });
});

describe("portable pack — validatePackTree (import leniency)", () => {
  it("keeps unknown block types and records them in missingTypes", () => {
    const v = validatePackTree([heading, unknown]);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.blocks).toHaveLength(2);
      expect(v.missingTypes).toContain("future-block");
      expect(v.dropped).toEqual([]);
    }
  });

  it("drops a known type with invalid content and records it in dropped", () => {
    const v = validatePackTree([heading, badHeading]);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.blocks).toHaveLength(1);
      expect(v.dropped).toContain("heading");
      expect(v.missingTypes).toEqual([]);
    }
  });

  it("rejects a tree that exceeds the size cap", () => {
    const huge = { id: "x", type: "heading", content: { text: "x".repeat(2_000_000), level: "h2", align: "left" } };
    expect(validatePackTree([huge]).ok).toBe(false);
  });
});

describe("portable pack — exportBlockPackJson", () => {
  it("serializes a block tree and computes requiredBlockTypes", () => {
    const pack = exportBlockPackJson("My pack", [heading as never, unknown as never], { description: "d" }, 123);
    expect(pack.format).toBe(PACK_FORMAT);
    expect(pack.kind).toBe("block-pack");
    expect(pack.name).toBe("My pack");
    expect(pack.description).toBe("d");
    expect(pack.requiredBlockTypes).toEqual(expect.arrayContaining(["heading", "future-block"]));
    expect(pack.generatedAt).toBe(123);
  });

  it("round-trips export → import for a known-only tree", () => {
    const pack = exportBlockPackJson("Round", [heading as never], {}, 1);
    const back = importPackJson(pack);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.kind).toBe("block-pack");
      expect(back.blocks).toHaveLength(1);
    }
  });
});

describe("treeReferencedTypes", () => {
  it("collects every type in a flat tree", () => {
    expect(treeReferencedTypes([heading as never, unknown as never])).toEqual(
      expect.arrayContaining(["heading", "future-block"]),
    );
  });
});

describe("portable pack — design-pack", () => {
  it("rejects a design pack with no pages", () => {
    const res = importPackJson({
      format: PACK_FORMAT,
      kind: "design-pack",
      name: "x",
      theme: validTheme,
      pages: [],
    });
    expect(res.ok).toBe(false);
  });

  it("accepts a valid design pack with theme + page trees", () => {
    const res = importPackJson({
      format: PACK_FORMAT,
      kind: "design-pack",
      name: "Studio",
      theme: validTheme,
      pages: [
        { name: "Home", blockTree: [heading] },
        { name: "About", blockTree: [heading, unknown] },
      ],
      requiredBlockTypes: ["heading", "future-block"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("design-pack");
      expect(res.pages).toHaveLength(2);
      expect(res.theme).toEqual(validTheme);
      expect(res.requiredBlockTypes).toEqual(expect.arrayContaining(["heading", "future-block"]));
    }
  });

  it("rejects a design pack page with invalid blocks", () => {
    const res = importPackJson({
      format: PACK_FORMAT,
      kind: "design-pack",
      name: "x",
      theme: validTheme,
      pages: [{ name: "Home", blockTree: "not-an-array" }],
    });
    expect(res.ok).toBe(false);
  });

  it("exportDesignPackJson serializes theme + pages and computes requiredBlockTypes", () => {
    const pack = exportDesignPackJson(
      "Studio",
      validTheme,
      [
        { name: "Home", blockTree: [heading as never] },
        { name: "About", blockTree: [heading as never, unknown as never] },
      ],
      { description: "d" },
      42,
    );
    expect(pack.format).toBe(PACK_FORMAT);
    expect(pack.kind).toBe("design-pack");
    expect(pack.theme).toEqual(validTheme);
    expect(pack.pages).toHaveLength(2);
    expect(pack.requiredBlockTypes).toEqual(expect.arrayContaining(["heading", "future-block"]));
    expect(pack.generatedAt).toBe(42);
  });

  it("round-trips export → import for a design pack", () => {
    const pack = exportDesignPackJson(
      "Round",
      validTheme,
      [{ name: "Home", blockTree: [heading as never] }],
      {},
      1,
    );
    const back = importPackJson(pack);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.kind).toBe("design-pack");
      expect(back.pages).toHaveLength(1);
      expect(back.theme).toEqual(validTheme);
    }
  });
});
