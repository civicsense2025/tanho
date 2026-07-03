import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockShell } from "@/lib/blocks/core/BlockShell";
import type { StyleProps } from "@/lib/blocks/core/style-schema";

// BlockShell is the single place block StyleProps become real CSS. These tests lock in the
// load-bearing invariants: (1) no style ⇒ no wrapper (zero legacy regression), (2) base props
// map to token-referencing CSS on a single inline wrapper, (3) responsive overrides emit a
// scoped <style> with MOBILE-FIRST min-width container queries and a container/target split.
function render(style?: StyleProps) {
  return renderToStaticMarkup(
    <BlockShell style={style}>
      <p>content</p>
    </BlockShell>
  );
}

describe("BlockShell", () => {
  it("renders children with NO wrapper when style is absent or empty", () => {
    expect(render(undefined)).toBe("<p>content</p>");
    expect(render({})).toBe("<p>content</p>");
  });

  it("emits a single inline-styled wrapper for base-only style (no queries)", () => {
    const html = render({ align: "center", padTop: "6", color: "muted", radius: "md" });
    expect(html).toContain("text-align:center");
    expect(html).toContain("padding-top:var(--space-6)");
    expect(html).toContain("color:var(--text-muted)");
    expect(html).toContain("border-radius:var(--radius-md)");
    expect(html).toContain("container-type:inline-size");
    // Base-only path uses NO scoped <style> element and NO generated class.
    expect(html).not.toContain("<style>");
    expect(html).not.toContain("@container");
  });

  it("maps every space step through the token lookup (never a nonexistent --space-7)", () => {
    const html = render({ padBottom: "8" });
    expect(html).toContain("padding-bottom:var(--space-8)");
    // 7/9/11 don't exist in the scale; nothing should ever reference them.
    expect(html).not.toContain("--space-7");
  });

  it("re-points accent custom properties for the accent-2 swap", () => {
    const html = render({ accent: "accent-2" });
    expect(html).toContain("--accent:var(--accent-2)");
    expect(html).toContain("--accent-hover:var(--accent-2-hover)");
  });

  it("sets data-theme only for a non-inherit local theme", () => {
    expect(render({ theme: "dark" })).toContain('data-theme="dark"');
    expect(render({ theme: "inherit", align: "left" })).not.toContain("data-theme");
  });

  it("emits scoped <style> with mobile-first min-width container queries when responsive", () => {
    const html = render({
      columns: 1,
      padTop: "2",
      tablet: { padTop: "6" },
      desktop: { padTop: "12" },
    });
    // Outer element is the container; inner element carries the generated class.
    expect(html).toContain("container-type:inline-size");
    expect(html).toContain("<style>");
    // Base declarations, then tablet, then desktop — wider last (mobile-first cascade).
    expect(html).toMatch(/\.blk-[a-z0-9]+\{[^}]*padding-top:var\(--space-2\)/);
    expect(html).toContain("@container (min-width:48rem)");
    expect(html).toContain("@container (min-width:64rem)");
    const tabletIdx = html.indexOf("min-width:48rem");
    const desktopIdx = html.indexOf("min-width:64rem");
    expect(tabletIdx).toBeGreaterThan(-1);
    expect(desktopIdx).toBeGreaterThan(tabletIdx); // desktop rule comes after tablet in source order
  });

  it("produces a deterministic class for identical style objects (no hydration drift)", () => {
    const style: StyleProps = { padTop: "4", tablet: { padTop: "8" } };
    const a = render(style);
    const b = render({ ...style });
    const clsA = a.match(/blk-[a-z0-9]+/)?.[0];
    const clsB = b.match(/blk-[a-z0-9]+/)?.[0];
    expect(clsA).toBeTruthy();
    expect(clsA).toBe(clsB);
  });
});
