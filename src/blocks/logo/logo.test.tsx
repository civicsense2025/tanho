import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderLogo } from "./Render";
import { logoSchema } from "./fields";
import type { LogoResolved } from "./resolve";
import type { RenderCtx } from "../types";

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

const render = (partial: Record<string, unknown>, resolved?: LogoResolved): string =>
  renderToStaticMarkup(
    <RenderLogo content={{ ...logoSchema.parse(partial), _resolved: resolved }} ctx={ctx} />,
  );

describe("logo block", () => {
  it("links to / and uses the site name from the resolver when text is empty", () => {
    const html = render({ text: "", style: "mark" }, { siteName: "Acme Co" });
    expect(html).toContain('href="/"');
    expect(html).toContain("Acme Co");
    // initials square for mark style
    expect(html).toContain("AC");
  });

  it("prefers explicit text over the resolved site name", () => {
    const html = render({ text: "Studio", style: "wordmark" }, { siteName: "Acme Co" });
    expect(html).toContain("Studio");
    expect(html).not.toContain("Acme Co");
  });

  it("wordmark renders the name with no initials square", () => {
    const html = render({ text: "Studio", style: "wordmark" });
    expect(html).toContain("Studio");
  });

  it("icon style with a glyph renders the glyph, no wordmark", () => {
    const html = render({ text: "Acme", style: "icon", icon: "✦" });
    expect(html).toContain("✦");
    expect(html).not.toContain("Acme<"); // name not rendered as text node
  });

  it("invert uses semantic tokens, never raw hex", () => {
    const html = render({ text: "X", style: "mark", invert: true });
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(html).toContain("var(--paper-0)");
  });

  it("renders the image when src is set (image wins over the typographic mark)", () => {
    const html = render({ text: "Studio", style: "mark", src: "/logo.svg" }, { siteName: "Acme Co" });
    expect(html).toContain('src="/logo.svg"');
    // alt is the effective name; no initials square is drawn for an image logo.
    expect(html).toContain('alt="Studio"');
    expect(html).not.toContain("var(--solid)"); // the mark square token isn't rendered
  });

  it("falls back to the typographic mark when src is empty", () => {
    const html = render({ text: "Studio", style: "wordmark", src: "" });
    expect(html).not.toContain("<img");
    expect(html).toContain("Studio");
  });

  it("uses the resolved site name as image alt when text is empty", () => {
    const html = render({ text: "", style: "mark", src: "/api/media/x.png" }, { siteName: "Acme Co" });
    expect(html).toContain('alt="Acme Co"');
  });
});
