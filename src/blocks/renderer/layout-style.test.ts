import { describe, expect, it } from "vitest";
import {
  resolveLayoutLayer,
  layoutToVars,
  layoutBaseDecls,
  layoutIsGrid,
  hasAnyLayout,
} from "./layout-style";
import { layoutStyleContent, type BlockLayout } from "../common";
import { sectionSchema } from "../section/fields";
import { rowSchema } from "../row/fields";
import { z } from "zod";

/**
 * The layout layer's invariants: mobile-first merge, TOKENS-ONLY output (keyword /
 * bounded int / var(--token) — never raw px/hex), the opt-in contract, and the
 * custom-property emission that BlockRenderer turns into real @media responsiveness.
 */

const full: BlockLayout = {
  base: { direction: "column", gap: "4", justify: "center" },
  tablet: { direction: "row", cols: "2" },
  desktop: { cols: "3", gap: "8" },
};

describe("resolveLayoutLayer (mobile-first merge)", () => {
  it("mobile = base only", () => {
    expect(resolveLayoutLayer(full, "mobile")).toEqual({ direction: "column", gap: "4", justify: "center" });
  });
  it("tablet = base + tablet override", () => {
    expect(resolveLayoutLayer(full, "tablet")).toEqual({ direction: "row", gap: "4", justify: "center", cols: "2" });
  });
  it("desktop = base + tablet + desktop (desktop wins)", () => {
    expect(resolveLayoutLayer(full, "desktop")).toEqual({ direction: "row", gap: "8", justify: "center", cols: "3" });
  });
  it("undefined layout resolves to empty", () => {
    expect(resolveLayoutLayer(undefined, "desktop")).toEqual({});
  });
  it("does not mutate inputs", () => {
    const snap = JSON.parse(JSON.stringify(full));
    resolveLayoutLayer(full, "desktop");
    expect(full).toEqual(snap);
  });
});

describe("layoutToVars (tokens-only custom properties)", () => {
  it("maps flex controls to keyword custom properties", () => {
    const v = layoutToVars({ direction: "row-reverse", wrap: "wrap", justify: "between", align: "center" });
    expect(v["--pbl-direction"]).toBe("row-reverse");
    expect(v["--pbl-wrap"]).toBe("wrap");
    expect(v["--pbl-justify"]).toBe("space-between");
    expect(v["--pbl-align"]).toBe("center");
  });

  it("maps gap/colGap/rowGap/stickyTop to var(--space-*) tokens", () => {
    const v = layoutToVars({ gap: "6", colGap: "4", rowGap: "2", stickyTop: "8" });
    expect(v["--pbl-gap"]).toBe("var(--space-6)");
    expect(v["--pbl-col-gap"]).toBe("var(--space-4)");
    expect(v["--pbl-row-gap"]).toBe("var(--space-2)");
    expect(v["--pbl-sticky-top"]).toBe("var(--space-8)");
  });

  it("maps z-index and order to bounded integers/keywords", () => {
    expect(layoutToVars({ zIndex: "overlay" })["--pbl-z"]).toBe("40");
    expect(layoutToVars({ zIndex: "base" })["--pbl-z"]).toBe("auto");
    expect(layoutToVars({ order: "-2" })["--pbl-order"]).toBe("-2");
  });

  it("even cols → repeat(n, minmax(0,1fr)); uneven template → fr tracks", () => {
    expect(layoutToVars({ cols: "3" })["--pbl-cols"]).toBe("repeat(3, minmax(0, 1fr))");
    expect(layoutToVars({ colTemplate: "1-2" })["--pbl-cols"]).toBe("1fr 2fr");
  });

  it("minColWidth wins (auto-fit grid) and uses a var(--space-*) token", () => {
    const v = layoutToVars({ cols: "4", minColWidth: "8" });
    expect(v["--pbl-cols"]).toBe("repeat(auto-fit, minmax(var(--space-8), 1fr))");
  });

  it("minColWidth:none does not force auto-fit (falls back to cols)", () => {
    expect(layoutToVars({ cols: "2", minColWidth: "none" })["--pbl-cols"]).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("emits ONLY tokens/keywords/ints — no raw px or hex", () => {
    const v = layoutToVars({
      direction: "row", justify: "evenly", align: "baseline", gap: "12", colGap: "6", rowGap: "4",
      position: "sticky", stickyTop: "10", zIndex: "raised", order: "2", alignSelf: "end",
      basis: "half", grow: "1", shrink: "0", cols: "4",
    });
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/#[0-9a-fA-F]{3,6}/); // no hex
    expect(json).not.toMatch(/\d+px/); // no raw px
    expect(json).not.toMatch(/--maroon|--olive|--paper-|--ink-/); // no raw primitives
  });

  it("skips undefined values", () => {
    expect(layoutToVars({})).toEqual({});
    expect(Object.values(layoutToVars({ gap: "4" }))).not.toContain(undefined);
  });
});

describe("layoutBaseDecls + layoutIsGrid", () => {
  it("flex mode consumes flex custom properties", () => {
    const d = layoutBaseDecls(false);
    expect(d).toContain("display:flex");
    expect(d).toContain("flex-direction:var(--pbl-direction, row)");
    expect(d).toContain("gap:var(--pbl-gap, var(--space-6))");
  });
  it("grid mode consumes grid custom properties", () => {
    const d = layoutBaseDecls(true);
    expect(d).toContain("display:grid");
    expect(d).toContain("grid-template-columns:var(--pbl-cols, 1fr)");
  });
  it("layoutIsGrid true when any breakpoint sets a column template", () => {
    expect(layoutIsGrid({ base: { direction: "row" } })).toBe(false);
    expect(layoutIsGrid({ base: {}, tablet: { cols: "2" } })).toBe(true);
    expect(layoutIsGrid({ base: { colTemplate: "1-2" } })).toBe(true);
    expect(layoutIsGrid({ base: { minColWidth: "none" } })).toBe(false);
    expect(layoutIsGrid({ base: { minColWidth: "8" } })).toBe(true);
  });
  it("hasAnyLayout false for empty/undefined, true once a control is set", () => {
    expect(hasAnyLayout(undefined)).toBe(false);
    expect(hasAnyLayout({})).toBe(false);
    expect(hasAnyLayout({ base: {} })).toBe(false);
    expect(hasAnyLayout({ desktop: { gap: "4" } })).toBe(true);
  });
});

describe("opt-in contract (only layout blocks carry `layout`)", () => {
  it("section/row preserve `layout` through safeParse", () => {
    const parsed = sectionSchema.safeParse({ layout: { base: { direction: "row" } } });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.layout).toEqual({ base: { direction: "row" } });
    expect(rowSchema.safeParse({ layout: { base: { cols: "2" } } }).success).toBe(true);
  });

  it("a non-opted schema strips `layout`", () => {
    const bare = z.object({ text: z.string() });
    const parsed = bare.safeParse({ text: "hi", layout: { base: { direction: "row" } } });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect((parsed.data as { layout?: unknown }).layout).toBeUndefined();
  });

  it("rejects a non-token layout value", () => {
    const schema = z.object({ ...layoutStyleContent });
    expect(schema.safeParse({ layout: { base: { direction: "diagonal" } } }).success).toBe(false);
    expect(schema.safeParse({ layout: { base: { cols: "99" } } }).success).toBe(false);
  });
});
