import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderCtaButton } from "./Render";
import { ctaButtonSchema } from "./fields";
import type { RenderCtx } from "../types";

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

const render = (partial: Record<string, unknown>): string =>
  renderToStaticMarkup(<RenderCtaButton content={ctaButtonSchema.parse(partial)} ctx={ctx} />);

describe("cta-button block", () => {
  it("renders an anchor with the label and href", () => {
    const html = render({ label: "Get started", href: "/join", variant: "solid" });
    expect(html).toContain("<a");
    expect(html).toContain('href="/join"');
    expect(html).toContain("Get started");
  });

  it("renders nothing without a label", () => {
    expect(render({ label: "", href: "/x", variant: "solid" })).toBe("");
  });

  it("external links get rel=noopener", () => {
    const html = render({ label: "Docs", href: "https://example.com", variant: "outline" });
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("an unset href degrades to # (still visible)", () => {
    const html = render({ label: "Soon", href: "", variant: "solid" });
    expect(html).toContain('href="#"');
  });
});
