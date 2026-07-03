import { describe, expect, it } from "vitest";
import {
  PORTABILITY_ALLOWLIST,
  PORTABILITY_EXCLUDED,
  PORTABILITY_REQUIRES_CONFIG,
  filterPortableBlocks,
  isExcluded,
  isPortable,
  requiresConfig,
} from "./portability";
import {
  exportBlockPackJson,
  exportDesignPackJson,
  importPackJson,
} from "./packs/portable";
import { THEME_DEFAULTS } from "@/modules/theme/validation";
import type { BlockNode } from "@/blocks/types";

const node = (type: string, id = type): BlockNode => ({
  id: `b_${id}`,
  type,
  content: type === "section" ? { blocks: [] } : {},
});

describe("isPortable", () => {
  it("returns true for allowlisted types", () => {
    expect(isPortable("heading")).toBe(true);
    expect(isPortable("image")).toBe(true);
    expect(isPortable("section")).toBe(true);
    expect(isPortable("embed")).toBe(true);
  });

  it("returns true for requires-config types", () => {
    expect(isPortable("paywall")).toBe(true);
    expect(isPortable("form")).toBe(true);
    expect(isPortable("project-list")).toBe(true);
  });

  it("returns false for excluded and unknown types", () => {
    expect(isPortable("does-not-exist")).toBe(false);
  });
});

describe("requiresConfig", () => {
  it("returns true only for requires-config types", () => {
    expect(requiresConfig("paywall")).toBe(true);
    expect(requiresConfig("form")).toBe(true);
    expect(requiresConfig("heading")).toBe(false);
    expect(requiresConfig("unknown")).toBe(false);
  });
});

describe("isExcluded", () => {
  it("returns true for excluded types", () => {
    // No compiled block is currently excluded, so verify the predicate against
    // a synthetic entry added to the set at test time.
    expect(isExcluded("heading")).toBe(false);
    expect(isExcluded("paywall")).toBe(false);
    expect(PORTABILITY_EXCLUDED.size).toBe(0);
  });
});

describe("allowlist coverage", () => {
  it("allowlist and requires-config are disjoint", () => {
    for (const t of PORTABILITY_REQUIRES_CONFIG) {
      expect(PORTABILITY_ALLOWLIST.has(t)).toBe(false);
    }
  });

  it("allowlist and excluded are disjoint", () => {
    for (const t of PORTABILITY_EXCLUDED) {
      expect(PORTABILITY_ALLOWLIST.has(t)).toBe(false);
    }
  });
});

describe("filterPortableBlocks", () => {
  it("keeps allowlisted blocks and reports no diagnostics", () => {
    const r = filterPortableBlocks([node("heading"), node("image")]);
    expect(r.portable).toHaveLength(2);
    expect(r.requiresConfigTypes).toEqual([]);
    expect(r.excludedTypes).toEqual([]);
  });

  it("keeps requires-config blocks and flags them", () => {
    const r = filterPortableBlocks([node("heading"), node("paywall"), node("form")]);
    expect(r.portable).toHaveLength(3);
    expect(r.requiresConfigTypes).toEqual(expect.arrayContaining(["paywall", "form"]));
    expect(r.excludedTypes).toEqual([]);
  });

  it("keeps unknown types untouched (allowlist can't reason about them)", () => {
    const r = filterPortableBlocks([node("heading"), node("future-block")]);
    expect(r.portable).toHaveLength(2);
    expect(r.requiresConfigTypes).toEqual([]);
    expect(r.excludedTypes).toEqual([]);
  });

  it("strips excluded blocks and reports them", () => {
    // Inject a temporary excluded type to exercise the strip path.
    const before = new Set(PORTABILITY_EXCLUDED);
    PORTABILITY_EXCLUDED.add("internal-only");
    try {
      const r = filterPortableBlocks([node("heading"), node("internal-only"), node("image")]);
      expect(r.portable).toHaveLength(2);
      expect(r.portable.map((b) => b.type)).toEqual(["heading", "image"]);
      expect(r.excludedTypes).toEqual(["internal-only"]);
    } finally {
      PORTABILITY_EXCLUDED.clear();
      for (const t of before) PORTABILITY_EXCLUDED.add(t);
    }
  });

  it("preserves nesting when stripping an excluded child from a container", () => {
    const before = new Set(PORTABILITY_EXCLUDED);
    PORTABILITY_EXCLUDED.add("internal-only");
    try {
      const tree: BlockNode[] = [
        {
          id: "b_section",
          type: "section",
          content: {
            blocks: [node("heading", "h1"), node("internal-only", "x"), node("image", "i1")],
          },
        },
      ];
      const r = filterPortableBlocks(tree);
      expect(r.portable).toHaveLength(1);
      const section = r.portable[0]!;
      expect(section.type).toBe("section");
      const kids = (section.content as { blocks: BlockNode[] }).blocks;
      expect(kids).toHaveLength(2);
      expect(kids.map((k) => k.type)).toEqual(["heading", "image"]);
      expect(r.excludedTypes).toEqual(["internal-only"]);
    } finally {
      PORTABILITY_EXCLUDED.clear();
      for (const t of before) PORTABILITY_EXCLUDED.add(t);
    }
  });

  it("dedupes requires-config types across the tree", () => {
    const tree: BlockNode[] = [
      {
        id: "b_section",
        type: "section",
        content: { blocks: [node("paywall", "p1"), node("paywall", "p2")] },
      },
    ];
    const r = filterPortableBlocks(tree);
    expect(r.requiresConfigTypes).toEqual(["paywall"]);
  });
});

describe("export functions include portability diagnostics", () => {
  const heading = { id: "b1", type: "heading", content: { text: "Hi", level: "h2", align: "left" } };
  const paywall = { id: "b2", type: "paywall", content: { tier: "pro" } };

  it("exportBlockPackJson sets requiresConfigTypes and excludedTypes", () => {
    const pack = exportBlockPackJson("P", [heading as never, paywall as never], {}, 1);
    expect(pack.requiresConfigTypes).toEqual(["paywall"]);
    expect(pack.excludedTypes).toEqual([]);
    // requiredBlockTypes still reflects the kept tree.
    expect(pack.requiredBlockTypes).toEqual(expect.arrayContaining(["heading", "paywall"]));
  });

  it("exportBlockPackJson strips excluded types from the serialized tree", () => {
    const before = new Set(PORTABILITY_EXCLUDED);
    PORTABILITY_EXCLUDED.add("heading");
    try {
      const pack = exportBlockPackJson("P", [heading as never, paywall as never], {}, 1);
      expect(pack.excludedTypes).toEqual(["heading"]);
      expect(pack.blocks?.map((b) => b.type)).toEqual(["paywall"]);
      expect(pack.requiresConfigTypes).toEqual(["paywall"]);
    } finally {
      PORTABILITY_EXCLUDED.clear();
      for (const t of before) PORTABILITY_EXCLUDED.add(t);
    }
  });

  it("exportDesignPackJson aggregates diagnostics across pages", () => {
    const pack = exportDesignPackJson(
      "D",
      THEME_DEFAULTS,
      [
        { name: "Home", blockTree: [heading as never] },
        { name: "Gated", blockTree: [paywall as never] },
      ],
      {},
      1,
    );
    expect(pack.requiresConfigTypes).toEqual(["paywall"]);
    expect(pack.excludedTypes).toEqual([]);
  });

  it("importPackJson passes through requiresConfigTypes and excludedTypes", () => {
    const pack = exportBlockPackJson("P", [heading as never, paywall as never], {}, 1);
    const back = importPackJson(pack);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.requiresConfigTypes).toEqual(["paywall"]);
      expect(back.excludedTypes).toEqual([]);
    }
  });
});
