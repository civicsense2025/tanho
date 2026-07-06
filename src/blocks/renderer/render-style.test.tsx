import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "./BlockRenderer";
import type { BlockNode, Device } from "../types";

/**
 * End-to-end PUBLIC render path for the universal inner-box style layer and
 * hideOn per-device visibility. The served page uses ONE device branch, so
 * per-breakpoint style — like the layout layer (render-layout.test.tsx) — must
 * arrive as a scoped <style> with real @media overrides, never a ctx.device
 * branch. hideOn is NOT mobile-first (unlike style/layout): each hidden device
 * gets its own exact, non-overlapping viewport range.
 */
async function renderAt(block: BlockNode, device: Device = "desktop"): Promise<string> {
  const el = await RenderBlock({ block, device, mode: "public", viewer: null });
  return renderToStaticMarkup(el);
}

const styled: BlockNode = {
  id: "h",
  type: "heading",
  content: {
    text: "Hi",
    level: "h2",
    align: "left",
    style: {
      base: { padTop: "2", textColor: "muted" },
      tablet: { padTop: "6" },
      desktop: { padTop: "12" },
    },
  },
};

describe("style layer — scoped <style> with real @media responsiveness", () => {
  it("puts a generated per-block class on the wrapper", async () => {
    const html = await renderAt(styled);
    expect(html).toContain('data-block="heading"');
    expect(html).toContain('class="pb-h"');
  });

  it("emits base declarations directly on the block's own class (no @media)", async () => {
    const html = await renderAt(styled);
    expect(html).toContain(".pb-h{");
    expect(html).toMatch(/\.pb-h\{[^}]*padding-top:var\(--space-2\)/);
    expect(html).toMatch(/\.pb-h\{[^}]*color:var\(--text-muted\)/);
  });

  it("emits @media overrides for tablet (768) and desktop (1024); base colour persists via inheritance, not re-emission", async () => {
    const html = await renderAt(styled);
    expect(html).toMatch(/@media \(min-width:768px\)\{\.pb-h\{padding-top:var\(--space-6\)\}\}/);
    expect(html).toMatch(/@media \(min-width:1024px\)\{\.pb-h\{padding-top:var\(--space-12\)\}\}/);
    // The overrides only carry the CHANGED field — colour isn't re-declared per
    // breakpoint, real CSS cascade/inheritance carries it forward from .pb-h's
    // base rule, unlike the old per-device-resolved-object approach.
    const styleMatch = html.match(/<style data-block-style="">([\s\S]*?)<\/style>/);
    expect(styleMatch).toBeTruthy();
    const css = styleMatch![1]!;
    expect((css.match(/color:/g) ?? []).length).toBe(1);
  });

  it("this is real CSS shipped to every device — NOT resolved per the device param (unlike the old inline-style approach)", async () => {
    // Regression guard for the bug this layer fixes: rendering "at" mobile,
    // tablet, or desktop must all emit the SAME full multi-breakpoint <style>,
    // because the public page is served on one HTML document for every
    // viewport — there is no per-visitor device branch on the server.
    const mobile = await renderAt(styled, "mobile");
    const tablet = await renderAt(styled, "tablet");
    const desktop = await renderAt(styled, "desktop");
    expect(mobile).toBe(tablet);
    expect(tablet).toBe(desktop);
    expect(mobile).toMatch(/@media \(min-width:768px\)/);
    expect(mobile).toMatch(/@media \(min-width:1024px\)/);
  });

  it("an unstyled block emits the plain wrapper (no class, no style) — zero regression", async () => {
    const plain: BlockNode = { id: "p", type: "heading", content: { text: "Hi", level: "h2", align: "left" } };
    const html = await renderAt(plain);
    expect(html).toMatch(/<div data-block="heading">/);
    expect(html).not.toContain("padding-top");
    expect(html).not.toContain("data-block-style");
  });

  it("style applies to a BOUND block too (project-list) — Phase E", async () => {
    const bound: BlockNode = {
      id: "pl",
      type: "project-list",
      content: { source: "project", eyebrow: "", style: { base: { padTop: "6", background: "surface" } } },
    };
    const html = await renderAt(bound);
    expect(html).toContain('data-block="project-list"');
    expect(html).toMatch(/\.pb-pl\{[^}]*padding-top:var\(--space-6\)/);
    expect(html).toMatch(/\.pb-pl\{[^}]*background:var\(--surface\)/);
  });

  it("is token-only — no raw px/hex leaks into the emitted CSS", async () => {
    const html = await renderAt(styled);
    const styleMatch = html.match(/<style data-block-style="">([\s\S]*?)<\/style>/);
    const css = styleMatch![1]!;
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(css.replace(/min-width:\d+px/g, "")).not.toMatch(/\d+px/);
  });
});

describe("interaction states — hover/focus/active, responsive per breakpoint", () => {
  const withStates: BlockNode = {
    id: "s",
    type: "heading",
    content: {
      text: "Hi",
      level: "h2",
      align: "left",
      style: {
        base: {
          textColor: "default",
          hover: { textColor: "accent" },
          focus: { textColor: "accent-2" },
        },
        desktop: {
          hover: { textColor: "muted" }, // hover differs on desktop
        },
      },
    },
  };

  it("emits :hover and :focus-visible rules on the block class", async () => {
    const html = await renderAt(withStates);
    expect(html).toMatch(/\.pb-s:hover\{color:var\(--accent\)\}/);
    // focus uses :focus-visible (keyboard only), not bare :focus.
    expect(html).toMatch(/\.pb-s:focus-visible\{color:var\(--accent-2\)\}/);
    expect(html).not.toMatch(/\.pb-s:focus\{/); // bare :focus must NOT appear
  });

  it("state overrides are responsive: a desktop hover override lands inside the desktop @media", async () => {
    const html = await renderAt(withStates);
    // muted textColor maps to --text-muted; the desktop hover rule sits in the 1024 @media.
    expect(html).toMatch(/@media \(min-width:1024px\)\{\.pb-s:hover\{color:var\(--text-muted\)\}\}/);
  });

  it("state values are still token-only (no raw px/hex)", async () => {
    const html = await renderAt(withStates);
    const css = html.match(/<style data-block-style="">([\s\S]*?)<\/style>/)![1]!;
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});

describe("motion layer — guarded entrance animation, no-JS/reduced-motion safe", () => {
  const withMotion: BlockNode = {
    id: "m",
    type: "heading",
    content: {
      text: "Hi",
      level: "h2",
      align: "left",
      motion: { trigger: "in-view", effect: "fade-up", duration: "base", easing: "ease-out" },
    },
  };

  it("stamps data-motion + data-motion-trigger on the wrapper", async () => {
    const html = await renderAt(withMotion);
    expect(html).toMatch(/data-motion="fade-up"/);
    expect(html).toMatch(/data-motion-trigger="in-view"/);
  });

  it("hides initially ONLY under data-blocks-enhanced AND prefers-reduced-motion:no-preference", async () => {
    const html = await renderAt(withMotion);
    const css = html.match(/<style data-block-style="">([\s\S]*?)<\/style>/)![1]!;
    // The initial-hidden rule is doubly-guarded (JS present + motion not reduced).
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)/);
    expect(css).toMatch(/html\[data-blocks-enhanced\] \.pb-m\{opacity:0;transform:translateY\(16px\)/);
    // The revealed state resets to natural values.
    expect(css).toMatch(/\.pb-m\[data-motion-in\]\{opacity:1;transform:none;filter:none\}/);
  });

  it("a block with no motion (or trigger none) emits no motion CSS or attrs", async () => {
    const plain: BlockNode = { id: "n", type: "heading", content: { text: "Hi", level: "h2", align: "left" } };
    const html = await renderAt(plain);
    expect(html).not.toContain("data-motion");
    expect(html).not.toContain("prefers-reduced-motion");

    const none: BlockNode = {
      id: "o",
      type: "heading",
      content: { text: "Hi", level: "h2", align: "left", motion: { trigger: "none", effect: "fade" } },
    };
    const html2 = await renderAt(none);
    expect(html2).not.toContain("data-motion");
  });

  it("stagger sets data-motion-stagger (ms) on the container", async () => {
    // section is a layout block; give it motion with a stagger step.
    const section: BlockNode = {
      id: "sec",
      type: "section",
      content: {
        width: "contained",
        background: "none",
        py: "lg",
        blocks: [],
        motion: { trigger: "in-view", effect: "fade", stagger: "short" },
      },
    };
    const html = await renderAt(section);
    // "short" delay maps to 80ms.
    expect(html).toMatch(/data-motion-stagger="80ms"/);
  });
});

describe("advanced (raw-value) layer — scoped, sanitised, overrides token style", () => {
  const advanced: BlockNode = {
    id: "a",
    type: "heading",
    content: {
      text: "Hi",
      level: "h2",
      align: "left",
      // token style + raw advanced on the same block: advanced must win (emitted after).
      style: { base: { textColor: "muted" } },
      advancedStyle: {
        base: { "letter-spacing": "0.05em", "max-width": "250px" },
        desktop: { "letter-spacing": "0.1em" },
      },
    },
  };

  it("emits raw px/em values the token layer can't express, scoped to the block class", async () => {
    const html = await renderAt(advanced);
    expect(html).toMatch(/\.pb-a\{[^}]*letter-spacing:0\.05em/);
    expect(html).toMatch(/\.pb-a\{[^}]*max-width:250px/);
    expect(html).toMatch(/@media \(min-width:1024px\)\{\.pb-a\{letter-spacing:0\.1em\}\}/);
  });

  it("re-sanitises on render: a breakout value never reaches the page", async () => {
    const evil: BlockNode = {
      id: "e",
      type: "heading",
      content: {
        text: "Hi",
        level: "h2",
        align: "left",
        // These would only exist if they bypassed the save-time gate; render must still drop them.
        advancedStyle: {
          base: {
            color: "expression(alert(1))",
            content: "</style><script>x</script>",
            "font-weight": "700", // safe sibling survives
          },
        },
      },
    };
    const html = await renderAt(evil);
    expect(html).not.toMatch(/expression|<script|<\/style><script/i);
    // The one safe declaration still lands.
    expect(html).toMatch(/\.pb-e\{[^}]*font-weight:700/);
  });
});

describe("hideOn — exact per-device visibility, not mobile-first", () => {
  it("hidden on one device only: emits exactly that device's exact-range @media, none other", async () => {
    const block: BlockNode = { id: "x", type: "heading", content: { text: "Hi", level: "h2", align: "left", hideOn: ["mobile"] } };
    const html = await renderAt(block);
    expect(html).toMatch(/@media \(max-width:767px\)\{\.pb-x\{display:none\}\}/);
    expect(html).not.toMatch(/min-width:768px.*display:none/);
    expect(html).not.toMatch(/min-width:1024px.*display:none/);
  });

  it("hidden on tablet does NOT also hide on desktop (exact range, unlike mobile-first style/layout)", async () => {
    const block: BlockNode = { id: "y", type: "heading", content: { text: "Hi", level: "h2", align: "left", hideOn: ["tablet"] } };
    const html = await renderAt(block);
    expect(html).toMatch(/@media \(min-width:768px\) and \(max-width:1023px\)\{\.pb-y\{display:none\}\}/);
  });

  it("hidden on desktop only", async () => {
    const block: BlockNode = { id: "z", type: "heading", content: { text: "Hi", level: "h2", align: "left", hideOn: ["desktop"] } };
    const html = await renderAt(block);
    expect(html).toMatch(/@media \(min-width:1024px\)\{\.pb-z\{display:none\}\}/);
  });

  it("hidden on ALL three devices: never rendered at all (not shipped as always-display:none)", async () => {
    const block: BlockNode = {
      id: "w",
      type: "heading",
      content: { text: "Hi", level: "h2", align: "left", hideOn: ["mobile", "tablet", "desktop"] },
    };
    const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null });
    expect(el).toBeNull();
  });

  it("hidden on two of three devices still renders (present in DOM) with two exact-range rules", async () => {
    const block: BlockNode = {
      id: "v",
      type: "heading",
      content: { text: "Hi", level: "h2", align: "left", hideOn: ["mobile", "desktop"] },
    };
    const html = await renderAt(block);
    expect(html).toMatch(/@media \(max-width:767px\)\{\.pb-v\{display:none\}\}/);
    expect(html).toMatch(/@media \(min-width:1024px\)\{\.pb-v\{display:none\}\}/);
    expect(html).not.toMatch(/min-width:768px\) and \(max-width:1023px[^}]*\.pb-v/);
  });

  it("a block with no hideOn emits no hideOn CSS", async () => {
    const plain: BlockNode = { id: "u", type: "heading", content: { text: "Hi", level: "h2", align: "left" } };
    const html = await renderAt(plain);
    expect(html).not.toContain("display:none");
  });
});
