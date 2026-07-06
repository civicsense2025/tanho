import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderSiteHeader } from "./Render";
import { siteHeaderSchema } from "./fields";
import type { SiteHeaderResolved } from "./resolve";
import type { RenderCtx } from "../types";

const ctx = {
  mode: "public",
  device: "desktop",
  viewer: null,
  children: () => null,
} as unknown as RenderCtx;

const render = (partial: Record<string, unknown>, resolved?: SiteHeaderResolved): string =>
  renderToStaticMarkup(
    <RenderSiteHeader content={{ ...siteHeaderSchema.parse(partial), _resolved: resolved }} ctx={ctx} />,
  );

describe("site-header two-tier utility strip", () => {
  it("twoTier: false renders no strip regardless of resolved text", () => {
    const html = render({ twoTier: false }, { utilityText: "Free shipping over $50" });
    expect(html).not.toContain("Free shipping over $50");
  });

  it("twoTier: true renders the resolved utility text", () => {
    const html = render({ twoTier: true }, { utilityText: "Free shipping over $50" });
    expect(html).toContain("Free shipping over $50");
  });

  it("twoTier: true with empty resolved text renders no strip (nothing to show)", () => {
    const html = render({ twoTier: true }, { utilityText: "" });
    expect(html).not.toContain("header-module");
    // no crash, no empty strip element — content._resolved?.utilityText is falsy
  });

  it("never shows the strip when layout is sidebar, even with twoTier true", () => {
    const html = render({ twoTier: true, layout: "sidebar" }, { utilityText: "Free shipping over $50" });
    expect(html).not.toContain("Free shipping over $50");
  });
});
