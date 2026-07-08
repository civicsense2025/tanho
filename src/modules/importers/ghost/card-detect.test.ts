import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectCard } from "./card-detect";

describe("detectCard — image", () => {
  it("maps a real Ghost image card to a Lamina image block", async () => {
    // Shape confirmed against Ghost's own image-renderer.ts.
    const html = `<figure class="kg-card kg-image-card"><img src="https://example.com/photo.jpg" class="kg-image" alt="A photo" loading="lazy"><figcaption>A caption</figcaption></figure>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({
      type: "image",
      content: { src: "https://example.com/photo.jpg", alt: "A photo", caption: "A caption" },
    });
    expect(result?.issues).toEqual([]);
  });

  it("returns null for an image card with no img src at all", async () => {
    const html = `<figure class="kg-card kg-image-card"></figure>`;
    expect(await detectCard(html)).toBeNull();
  });
});

describe("detectCard — gallery", () => {
  it("maps a real Ghost gallery card to a Lamina gallery block", async () => {
    // Shape confirmed against Ghost's own gallery-renderer.ts.
    const html = `<figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="https://example.com/1.jpg" width="800" height="600" alt="One"></div><div class="kg-gallery-image"><img src="https://example.com/2.jpg" width="800" height="600" alt="Two"></div></div></div><figcaption>Gallery caption</figcaption></figure>`;
    const result = await detectCard(html);
    expect(result?.block.type).toBe("gallery");
    const content = result?.block.content as { cols: number; images: Array<{ src: string; alt: string; caption: string }> };
    expect(content.images).toHaveLength(2);
    expect(content.images[0]).toEqual({ src: "https://example.com/1.jpg", alt: "One", caption: "Gallery caption" });
    expect(content.images[1]).toEqual({ src: "https://example.com/2.jpg", alt: "Two", caption: "" });
  });

  it("returns null for a gallery card with no images", async () => {
    const html = `<figure class="kg-card kg-gallery-card"><div class="kg-gallery-container"></div></figure>`;
    expect(await detectCard(html)).toBeNull();
  });
});

describe("detectCard — callout", () => {
  it("maps a real Ghost callout card (blue) to a Lamina callout block with tone=info", async () => {
    // Shape confirmed against Ghost's own callout-renderer.ts.
    const html = `<div class="kg-card kg-callout-card kg-callout-card-blue"><div class="kg-callout-emoji">💡</div><div class="kg-callout-text">Good to know.</div></div>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({ type: "callout", content: { tone: "info", title: "💡", body: "Good to know." } });
    expect(result?.issues).toEqual([]);
  });

  it("maps a red callout to tone=danger", async () => {
    const html = `<div class="kg-card kg-callout-card kg-callout-card-red"><div class="kg-callout-text">Careful!</div></div>`;
    const result = await detectCard(html);
    expect((result?.block.content as { tone: string }).tone).toBe("danger");
  });

  it("falls back to tone=info and raises an issue for an unrecognized callout color", async () => {
    const html = `<div class="kg-card kg-callout-card kg-callout-card-teal"><div class="kg-callout-text">Hmm.</div></div>`;
    const result = await detectCard(html);
    expect((result?.block.content as { tone: string }).tone).toBe("info");
    expect(result?.issues).toEqual([expect.objectContaining({ kind: "callout-color-unmapped" })]);
  });

  it("returns null for a callout card with no text at all", async () => {
    const html = `<div class="kg-card kg-callout-card kg-callout-card-blue"></div>`;
    expect(await detectCard(html)).toBeNull();
  });
});

describe("detectCard — button", () => {
  it("maps a real Ghost button card to a Lamina buttons block", async () => {
    // Shape confirmed against Ghost's own button-renderer.ts.
    const html = `<div class="kg-card kg-btn-wide"><a href="https://example.com/signup" class="kg-btn kg-btn-accent">Sign up</a></div>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({
      type: "buttons",
      content: { align: "left", items: [{ label: "Sign up", href: "https://example.com/signup", variant: "solid", target: "_self" }] },
    });
  });

  it("returns null for a button card with no href", async () => {
    const html = `<div class="kg-card kg-btn-wide"><a class="kg-btn kg-btn-accent">Sign up</a></div>`;
    expect(await detectCard(html)).toBeNull();
  });

  it("returns null for a button with a javascript: href (stored-XSS guard)", async () => {
    const html = `<div class="kg-card kg-btn-wide"><a href="javascript:alert(1)" class="kg-btn kg-btn-accent">Hack</a></div>`;
    expect(await detectCard(html)).toBeNull();
  });

  it("returns null for a button with a data: href", async () => {
    const html = `<div class="kg-card kg-btn-wide"><a href="data:text/html,<script>alert(1)</script>" class="kg-btn kg-btn-accent">Hack</a></div>`;
    expect(await detectCard(html)).toBeNull();
  });

  it("keeps a relative /path href", async () => {
    const html = `<div class="kg-card kg-btn-wide"><a href="/relative/path" class="kg-btn kg-btn-accent">Go</a></div>`;
    const result = await detectCard(html);
    expect((result?.block.content as { items: Array<{ href: string }> }).items[0]!.href).toBe("/relative/path");
  });

  it("keeps a mailto: href", async () => {
    const html = `<div class="kg-card kg-btn-wide"><a href="mailto:foo@bar.com" class="kg-btn kg-btn-accent">Email</a></div>`;
    const result = await detectCard(html);
    expect((result?.block.content as { items: Array<{ href: string }> }).items[0]!.href).toBe("mailto:foo@bar.com");
  });
});

describe("detectCard — bookmark", () => {
  it("downgrades a real Ghost bookmark card to a labeled-link buttons block, and raises an issue", async () => {
    // Shape confirmed against Ghost's own bookmark-renderer.ts (frontendTemplate).
    const html = `<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://example.com/article"><div class="kg-bookmark-content"><div class="kg-bookmark-title">A great article</div><div class="kg-bookmark-description">Description text</div></div></a></figure>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({
      type: "buttons",
      content: { align: "left", items: [{ label: "A great article", href: "https://example.com/article", variant: "outline", target: "_blank" }] },
    });
    expect(result?.issues).toEqual([expect.objectContaining({ kind: "bookmark-downgraded" })]);
  });

  it("falls back to the URL as the label when the bookmark has no title", async () => {
    const html = `<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://example.com/x"><div class="kg-bookmark-content"></div></a></figure>`;
    const result = await detectCard(html);
    expect((result?.block.content as { items: Array<{ label: string }> }).items[0]!.label).toBe("https://example.com/x");
  });

  it("returns null for a bookmark card with no href", async () => {
    const html = `<figure class="kg-card kg-bookmark-card"></figure>`;
    expect(await detectCard(html)).toBeNull();
  });

  it("returns null for a bookmark with a javascript: href", async () => {
    const html = `<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="javascript:alert(1)"><div class="kg-bookmark-content"><div class="kg-bookmark-title">x</div></div></a></figure>`;
    expect(await detectCard(html)).toBeNull();
  });
});

describe("detectCard — embed", () => {
  it("maps a Ghost YouTube embed (bare iframe) to a Lamina embed block", async () => {
    const html = `<figure class="kg-card kg-embed-card"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></figure>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({ type: "embed", content: { provider: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", ratio: "16 / 9" } });
    expect(result?.issues).toEqual([]);
  });

  it("maps a Ghost Twitter embed (blockquote+anchor, confirmed against twitter.ts's non-email render path) to a Lamina twitter embed block", async () => {
    const html = `<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><a href="https://twitter.com/jack/status/20">https://twitter.com/jack/status/20</a></blockquote></figure>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({ type: "embed", content: { provider: "twitter", url: "https://twitter.com/jack/status/20", ratio: "16 / 9" } });
    expect(result?.issues).toEqual([]);
  });

  it("downgrades an embed from an unsupported provider to a labeled link, and raises an issue", async () => {
    const html = `<figure class="kg-card kg-embed-card"><iframe src="https://www.dailymotion.com/embed/video/x123"></iframe></figure>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({
      type: "buttons",
      content: { align: "left", items: [{ label: "View on www.dailymotion.com", href: "https://www.dailymotion.com/embed/video/x123", variant: "outline", target: "_blank" }] },
    });
    expect(result?.issues).toEqual([expect.objectContaining({ kind: "embed-unsupported" })]);
  });

  it("returns null for an embed card with no iframe and no link at all", async () => {
    const html = `<figure class="kg-card kg-embed-card"><script>somethingWeird()</script></figure>`;
    expect(await detectCard(html)).toBeNull();
  });

  it("returns null for an embed whose only link is a javascript: href (no unsafe fallback link)", async () => {
    const html = `<figure class="kg-card kg-embed-card"><a href="javascript:alert(1)">click</a></figure>`;
    expect(await detectCard(html)).toBeNull();
  });
});

describe("detectCard — soundcloud embed (mocked network, via the real resolver)", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        html: '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293"></iframe>',
      }),
    });
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves a soundcloud embed's link through the real async resolver", async () => {
    const html = `<figure class="kg-card kg-embed-card"><a href="https://soundcloud.com/forss/flickermood">Listen</a></figure>`;
    const result = await detectCard(html);
    expect(result?.block).toEqual({
      type: "embed",
      content: { provider: "soundcloud", url: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293", ratio: "16 / 9" },
    });
  });
});

describe("detectCard — unrecognized content", () => {
  it("returns null for a plain paragraph (falls through to the richtext path unchanged)", async () => {
    expect(await detectCard("<p>Just a normal paragraph.</p>")).toBeNull();
  });

  it("returns null for a heading", async () => {
    expect(await detectCard("<h2>A heading</h2>")).toBeNull();
  });

  it("returns null for an unrecognized kg-* class", async () => {
    expect(await detectCard(`<div class="kg-card kg-some-future-card-type">new stuff</div>`)).toBeNull();
  });
});
