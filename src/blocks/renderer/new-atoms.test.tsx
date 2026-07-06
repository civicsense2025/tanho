import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "./BlockRenderer";
import { createBlock } from "../registry";
import type { BlockNode } from "../types";

/**
 * Smoke + fallback coverage for the Phase-3 motion atoms. Each renders through the
 * real public path (RenderBlock → HTML). The load-bearing property for the JS-driven
 * ones (counter, before/after) is a WORKING no-JS fallback: the server HTML shows the
 * final value / a usable control, never a blank/0 state.
 */
async function render(block: BlockNode): Promise<string> {
  const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null });
  return el ? renderToStaticMarkup(el) : "";
}

describe("new motion atoms — render + no-JS fallback", () => {
  it("every new atom renders from its defaults without throwing", async () => {
    for (const type of ["stepper", "marquee", "counter", "flip-card", "before-after"]) {
      const html = await render(createBlock(type));
      expect(html, `${type} should render non-empty`).toContain(`data-block="${type}"`);
    }
  });

  it("stepper renders numbered markers + step labels", async () => {
    const html = await render(createBlock("stepper"));
    expect(html).toContain("Account");
    expect(html).toMatch(/<ol/); // ordered list semantics
  });

  it("counter's no-JS fallback shows the FINAL grouped number, not 0", async () => {
    const html = await render(createBlock("counter")); // default value 1200
    expect(html).toContain("1,200"); // grouped thousands, rendered server-side
    expect(html).toMatch(/data-counter-to="1200"/);
  });

  it("before/after with no images shows a placeholder prompt (never a broken slider)", async () => {
    const html = await render(createBlock("before-after")); // default empty srcs
    expect(html).toContain("Add a before and after image");
  });

  it("marquee duplicates the track for a seamless loop and marks the copy aria-hidden", async () => {
    const html = await render(createBlock("marquee"));
    // The first item appears twice (two track copies); one copy is aria-hidden.
    expect((html.match(/Ship fast/g) ?? []).length).toBe(2);
    expect(html).toContain('aria-hidden="true"');
  });

  it("flip-card exposes both faces", async () => {
    const html = await render(createBlock("flip-card"));
    expect(html).toContain("Hover me");
    expect(html).toContain("Nice to meet you");
  });
});

describe("Phase-4 interactive atoms — render + no-JS fallback", () => {
  it("tabs shows EVERY panel with its label in the no-JS fallback (nothing hidden in SSR)", async () => {
    const html = await render(createBlock("tabs"));
    // All three panel bodies present, none SSR-`hidden` (island hides inactive ones).
    expect(html).toContain("The big picture goes here.");
    expect(html).toContain("The specifics live on this tab.");
    expect(html).not.toMatch(/data-tab-panel[^>]*hidden/);
    expect(html).toMatch(/role="tablist"/);
  });

  it("tooltip renders trigger + tip and carries the tip as a native title", async () => {
    const html = await render(createBlock("tooltip"));
    expect(html).toContain("hover me");
    expect(html).toMatch(/title="Here&#x27;s a helpful hint\.|title="Here's a helpful hint\./);
    expect(html).toMatch(/role="tooltip"/);
  });

  it("countdown with no target renders an empty wrapper; with a target renders unit slots", async () => {
    // default target is "" → the block renders null (empty wrapper, no timer).
    const empty = await render(createBlock("countdown"));
    expect(empty).toContain('data-block="countdown"');
    expect(empty).not.toContain("data-countdown-target");
    // With a target, the '--' placeholders + data hooks appear (island fills them).
    const el = await RenderBlock({
      block: { id: "cd", type: "countdown", content: { target: "2099-01-01T00:00:00Z", units: ["days", "hours", "minutes", "seconds"], expiredText: "done", label: "" } },
      device: "desktop",
      mode: "public",
      viewer: null,
    });
    const html = renderToStaticMarkup(el);
    expect(html).toMatch(/data-countdown-target="2099-01-01T00:00:00Z"/);
    expect(html).toMatch(/data-countdown-unit="days"/);
  });

  it("html-embed sanitises: a pasted <script> is stripped, a safe iframe is hardened", async () => {
    const el = await RenderBlock({
      block: {
        id: "he",
        type: "html-embed",
        content: { html: '<script>alert(1)</script><iframe src="https://www.youtube.com/embed/x"></iframe>' },
      },
      device: "desktop",
      mode: "public",
      viewer: null,
    });
    const html = renderToStaticMarkup(el);
    expect(html).not.toMatch(/<script/i);
    expect(html).toMatch(/<iframe/i);
    expect(html).toMatch(/sandbox=/);
  });

  it("html-embed with empty html renders an empty wrapper (no embed markup)", async () => {
    const html = await render(createBlock("html-embed"));
    expect(html).toContain('data-block="html-embed"');
    expect(html).not.toContain("data-html-embed");
  });

  it("lottie renders a server-pure mount point with data-lottie-* (island plays it)", async () => {
    // lottie-web is installed in dev, so the block is available; give it a src.
    const el = await RenderBlock({
      block: {
        id: "lot",
        type: "lottie",
        content: { src: "/anim.json", loop: true, trigger: "in-view", maxWidth: "md", alt: "demo" },
      },
      device: "desktop",
      mode: "public",
      viewer: null,
    });
    const html = renderToStaticMarkup(el);
    expect(html).toMatch(/data-lottie-src="\/anim\.json"/);
    expect(html).toMatch(/data-lottie-trigger="in-view"/);
    // No lottie-web bundled server-side — it's a bare mount, no <svg> yet.
    expect(html).not.toMatch(/<svg/);
  });

  it("lottie with no src renders an empty wrapper", async () => {
    expect(await render(createBlock("lottie"))).toContain('data-block="lottie"');
    expect(await render(createBlock("lottie"))).not.toContain("data-lottie-src");
  });
});
