import { describe, expect, it } from "vitest";
import { resolveStyleLayer, styleToCss, hasStyle } from "./style";
import { headingDef } from "../heading/def";
import { styleContent, type BlockStyle } from "../common";
import { z } from "zod";

// The style layer's load-bearing invariants: mobile-first merge (base < tablet <
// desktop), tokens-only output, key-deletion-means-fall-through, and the opt-in
// contract that zod strip-mode enforces.

describe("resolveStyleLayer (mobile-first merge)", () => {
  const style: BlockStyle = {
    base: { padTop: "2", textColor: "muted" },
    tablet: { padTop: "6" },
    desktop: { padTop: "12" },
  };

  it("mobile = base only", () => {
    expect(resolveStyleLayer(style, "mobile")).toEqual({ padTop: "2", textColor: "muted" });
  });

  it("tablet = base + tablet override (ignores desktop)", () => {
    expect(resolveStyleLayer(style, "tablet")).toEqual({ padTop: "6", textColor: "muted" });
  });

  it("desktop = base + tablet + desktop (desktop wins, base fills)", () => {
    expect(resolveStyleLayer(style, "desktop")).toEqual({ padTop: "12", textColor: "muted" });
  });

  it("base+desktop but NOT tablet: tablet inherits base, desktop overrides", () => {
    const s: BlockStyle = { base: { padTop: "2" }, desktop: { padTop: "12" } };
    expect(resolveStyleLayer(s, "tablet")).toEqual({ padTop: "2" });
    expect(resolveStyleLayer(s, "desktop")).toEqual({ padTop: "12" });
  });

  it("a DELETED override key falls through to base (not clobbered)", () => {
    // "unset on tablet" is a missing key — base must win, not become undefined.
    const s: BlockStyle = { base: { textColor: "accent" }, tablet: { padTop: "4" } };
    expect(resolveStyleLayer(s, "tablet")).toEqual({ textColor: "accent", padTop: "4" });
  });

  it("undefined style resolves to an empty layer", () => {
    expect(resolveStyleLayer(undefined, "desktop")).toEqual({});
  });

  it("does not mutate the input layers", () => {
    const s: BlockStyle = { base: { padTop: "2" }, desktop: { padTop: "12" } };
    const snapshot = JSON.parse(JSON.stringify(s));
    resolveStyleLayer(s, "desktop");
    expect(s).toEqual(snapshot);
  });
});

describe("styleToCss (tokens-only mapping)", () => {
  it("maps enums to semantic CSS vars", () => {
    const css = styleToCss({ padTop: "6", textColor: "muted", radius: "md", shadow: "sm" });
    expect(css.paddingTop).toBe("var(--space-6)");
    expect(css.color).toBe("var(--text-muted)");
    expect(css.borderRadius).toBe("var(--radius-md)");
    expect(css.boxShadow).toBe("var(--shadow-sm)");
  });

  it("never emits a nonexistent --space-7 (non-contiguous scale)", () => {
    const css = styleToCss({ padBottom: "8" });
    expect(css.paddingBottom).toBe("var(--space-8)");
    expect(JSON.stringify(css)).not.toContain("--space-7");
  });

  it("emits ONLY semantic tokens — no raw primitives, px, or hex", () => {
    const css = styleToCss({
      padTop: "4", fontSize: "h1", fontWeight: "medium", leading: "snug", tracking: "wide",
      font: "heading", textColor: "accent", background: "tint", borderWidth: "hairline",
      radius: "sm", shadow: "md", align: "center",
    });
    const json = JSON.stringify(css);
    expect(json).not.toMatch(/--maroon|--olive|--paper-|--ink-/); // no raw primitives
    expect(json).not.toMatch(/#[0-9a-fA-F]{3,6}/); // no hex
  });

  it("skips undefined/empty values (no undefined in output)", () => {
    const css = styleToCss({ padTop: undefined, textColor: "muted" });
    expect(Object.values(css)).not.toContain(undefined);
    expect(css.paddingTop).toBeUndefined();
    expect(css.color).toBe("var(--text-muted)");
  });

  it("a full border only appears with a non-zero width", () => {
    expect(styleToCss({ borderWidth: "none" }).borderWidth).toBeUndefined();
    const css = styleToCss({ borderWidth: "hairline" });
    expect(css.borderWidth).toBe("var(--border-width)");
    expect(css.borderStyle).toBe("solid");
    expect(css.borderColor).toBe("var(--border)");
  });
});

describe("hasStyle", () => {
  it("false for empty, true once any value is set", () => {
    expect(hasStyle({})).toBe(false);
    expect(hasStyle({ padTop: undefined })).toBe(false);
    expect(hasStyle({ padTop: "2" })).toBe(true);
  });
});

describe("opt-in contract (zod strip-mode)", () => {
  it("an opted-in block preserves style through safeParse", () => {
    const content = { text: "hi", level: "h2", align: "left", style: { base: { padTop: "4" } } };
    const parsed = headingDef.schema.safeParse(content);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect((parsed.data as { style?: unknown }).style).toEqual({ base: { padTop: "4" } });
  });

  it("a NON-opted schema strips style (proves opt-in is required)", () => {
    // A bare schema without ...styleContent — zod default strip drops unknown keys.
    const bare = z.object({ text: z.string() });
    const parsed = bare.safeParse({ text: "hi", style: { base: { padTop: "4" } } });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect((parsed.data as { style?: unknown }).style).toBeUndefined();
  });

  it("styleContent.style rejects a non-token value", () => {
    const schema = z.object({ ...styleContent });
    expect(schema.safeParse({ style: { base: { padTop: "bogus" } } }).success).toBe(false);
  });
});
