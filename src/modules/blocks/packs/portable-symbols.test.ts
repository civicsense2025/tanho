import { describe, expect, it } from "vitest";
import { collectSymbolIds, remapSymbolIds, importPackJson, PACK_FORMAT } from "./portable";
import type { BlockNodeInput } from "@/modules/pages/validation";

const tree = (): BlockNodeInput[] => [
  { id: "a", type: "heading", content: { text: "x", level: "h2", align: "left" } },
  { id: "b", type: "symbol", content: { symbolId: "sym_old1" } },
  {
    id: "sec",
    type: "section",
    content: { blocks: [{ id: "c", type: "symbol", content: { symbolId: "sym_old2" } }] },
  },
];

describe("collectSymbolIds", () => {
  it("collects symbol ids at any depth, deduped", () => {
    expect(collectSymbolIds(tree()).sort()).toEqual(["sym_old1", "sym_old2"]);
  });

  it("dedupes repeated ids", () => {
    const t: BlockNodeInput[] = [
      { id: "a", type: "symbol", content: { symbolId: "s" } },
      { id: "b", type: "symbol", content: { symbolId: "s" } },
    ];
    expect(collectSymbolIds(t)).toEqual(["s"]);
  });

  it("returns [] when there are no symbols", () => {
    expect(collectSymbolIds([{ id: "a", type: "heading", content: {} }])).toEqual([]);
  });
});

describe("remapSymbolIds", () => {
  it("rewrites every symbolId through the id map, at any depth", () => {
    const out = remapSymbolIds(tree(), { sym_old1: "sym_new1", sym_old2: "sym_new2" });
    expect((out[1].content as { symbolId: string }).symbolId).toBe("sym_new1");
    const nested = (out[2].content as { blocks: BlockNodeInput[] }).blocks[0];
    expect((nested.content as { symbolId: string }).symbolId).toBe("sym_new2");
  });

  it("leaves an unmapped id untouched (dangling → placeholder contract)", () => {
    const out = remapSymbolIds(tree(), { sym_old1: "sym_new1" });
    expect((out[1].content as { symbolId: string }).symbolId).toBe("sym_new1");
    const nested = (out[2].content as { blocks: BlockNodeInput[] }).blocks[0];
    expect((nested.content as { symbolId: string }).symbolId).toBe("sym_old2"); // unchanged
  });

  it("does not mutate the input tree", () => {
    const t = tree();
    const snap = JSON.parse(JSON.stringify(t));
    remapSymbolIds(t, { sym_old1: "x" });
    expect(t).toEqual(snap);
  });
});

describe("importPackJson carries inlined symbols", () => {
  it("parses a block pack's symbols[] array", () => {
    const pack = {
      format: PACK_FORMAT,
      kind: "block-pack",
      name: "P",
      version: 1,
      blocks: [{ id: "b", type: "symbol", content: { symbolId: "sym_old1" } }],
      symbols: [
        { id: "sym_old1", name: "Hero", blockTree: [{ id: "h", type: "heading", content: { text: "Hi", level: "h2", align: "left" } }] },
      ],
      requiredBlockTypes: ["symbol"],
    };
    const res = importPackJson(pack);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.symbols).toHaveLength(1);
      expect(res.symbols![0].name).toBe("Hero");
      expect(res.symbols![0].id).toBe("sym_old1");
    }
  });

  it("drops a malformed symbol def (invalid blockTree) but keeps the pack", () => {
    const pack = {
      format: PACK_FORMAT,
      kind: "block-pack",
      name: "P",
      version: 1,
      blocks: [{ id: "b", type: "heading", content: { text: "x", level: "h2", align: "left" } }],
      symbols: [{ id: "bad", name: "Bad", blockTree: "not-an-array" }],
      requiredBlockTypes: [],
    };
    const res = importPackJson(pack);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.symbols).toEqual([]);
  });
});
