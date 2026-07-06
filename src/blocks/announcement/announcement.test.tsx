import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderAnnouncement } from "./Render";
import { announcementSchema } from "./fields";
import type { RenderCtx } from "../types";

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

const render = (partial: Record<string, unknown>): string =>
  renderToStaticMarkup(<RenderAnnouncement content={announcementSchema.parse(partial)} ctx={ctx} />);

describe("announcement block", () => {
  it("renders the first message as static (no-JS) HTML with an aria-labelled region", () => {
    const html = render({ messages: [{ text: "Hello world", ctaLabel: "", ctaHref: "" }] });
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Announcement"');
    expect(html).toContain("Hello world");
  });

  it("renders a CTA link when label + href are set", () => {
    const html = render({ messages: [{ text: "Sale", ctaLabel: "Shop", ctaHref: "/shop" }] });
    expect(html).toContain('href="/shop"');
    expect(html).toContain("Shop");
  });

  it("renders nothing when no message has text", () => {
    expect(render({ messages: [{ text: "", ctaLabel: "", ctaHref: "" }] })).toBe("");
    expect(render({ messages: [] })).toBe("");
  });

  it("marquee style concatenates every message (pure CSS scroll, no JS)", () => {
    const html = render({
      style: "marquee",
      messages: [
        { text: "One", ctaLabel: "", ctaHref: "" },
        { text: "Two", ctaLabel: "", ctaHref: "" },
      ],
    });
    // Both messages present, duplicated in the ticker track (no <script>/onClick).
    expect(html).toContain("One");
    expect(html).toContain("Two");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
  });

  it("emits no raw hex color (tokens-only) in inline styles", () => {
    const html = render({ style: "gradient", messages: [{ text: "Hi", ctaLabel: "", ctaHref: "" }] });
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
