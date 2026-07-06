import { describe, expect, it } from "vitest";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { blockDef } from "../registry";
import { symbolSchema } from "./fields";

// Phase 1 invariant: `symbol` is a REGISTERED block, so a symbol instance survives
// the strict page-save path (validateBlockTree). An unregistered type would be
// rejected — proving registration is what makes symbol nodes persistable.

describe("symbol block registration", () => {
  it("is registered in the block registry", () => {
    const def = blockDef("symbol");
    expect(def).toBeDefined();
    expect(def?.type).toBe("symbol");
  });

  it("a symbol instance survives strict validateBlockTree", () => {
    const res = validateBlockTree([
      { id: "s1", type: "symbol", content: { symbolId: "sym_abc", overrides: [] } },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.blocks[0].type).toBe("symbol");
      expect((res.blocks[0].content as { symbolId: string }).symbolId).toBe("sym_abc");
    }
  });

  it("preserves overrides through validation", () => {
    const res = validateBlockTree([
      {
        id: "s1",
        type: "symbol",
        content: { symbolId: "sym_abc", overrides: [{ targetId: "h1", patch: { text: "Hi" } }] },
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const c = res.blocks[0].content as { overrides: Array<{ targetId: string }> };
      expect(c.overrides[0].targetId).toBe("h1");
    }
  });

  it("rejects a symbol with no symbolId (schema requires it)", () => {
    const parsed = symbolSchema.safeParse({ overrides: [] });
    expect(parsed.success).toBe(false);
  });

  it("an UNregistered type is rejected by validateBlockTree (why registration matters)", () => {
    const res = validateBlockTree([{ id: "x", type: "not-a-real-block", content: {} }]);
    expect(res.ok).toBe(false);
  });
});
