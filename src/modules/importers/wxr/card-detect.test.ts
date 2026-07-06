import { describe, expect, it } from "vitest";
import { detectWxrCard } from "./card-detect";

// resolveEmbedUrl's YouTube path is a pure sync hostname rewrite (no network),
// so the embed test needs no mock. Spotify/SoundCloud aren't exercised here.

describe("detectWxrCard — image", () => {
  it("maps a wp-block-image figure to a native image block", async () => {
    const html = `<figure class="wp-block-image size-large"><img src="https://cdn.example.com/photo.jpg" alt="A photo"/><figcaption>A caption</figcaption></figure>`;
    const result = await detectWxrCard(html);
    expect(result?.block).toEqual({
      type: "image",
      content: { src: "https://cdn.example.com/photo.jpg", alt: "A photo", caption: "A caption" },
    });
  });

  it("maps a classic [caption] (wp-caption) block to an image block", async () => {
    const html = `<div class="wp-caption alignnone"><img src="https://cdn.example.com/c.jpg" alt="Cap"/><p class="wp-caption-text">Classic caption</p></div>`;
    const result = await detectWxrCard(html);
    expect(result?.block.type).toBe("image");
    expect(result?.block.content).toMatchObject({ src: "https://cdn.example.com/c.jpg", caption: "Classic caption" });
  });

  it("returns null for an image with only a data: placeholder (no real src)", async () => {
    const html = `<figure class="wp-block-image"><img src="data:image/gif;base64,PLACEHOLDER" alt="x"/></figure>`;
    const result = await detectWxrCard(html);
    expect(result).toBeNull();
  });
});

describe("detectWxrCard — gallery", () => {
  it("maps a wp-block-gallery with multiple images to a gallery block", async () => {
    const html = `<figure class="wp-block-gallery columns-3">
      <figure class="wp-block-image"><img src="https://cdn/1.jpg" alt="One"/></figure>
      <figure class="wp-block-image"><img src="https://cdn/2.jpg" alt="Two"/></figure>
      <figure class="wp-block-image"><img src="https://cdn/3.jpg" alt="Three"/></figure>
    </figure>`;
    const result = await detectWxrCard(html);
    expect(result?.block.type).toBe("gallery");
    const content = result?.block.content as { cols: number; images: Array<{ src: string }> };
    expect(content.images.map((i) => i.src)).toEqual(["https://cdn/1.jpg", "https://cdn/2.jpg", "https://cdn/3.jpg"]);
    expect(content.cols).toBe(3);
  });

  it("is checked before image (a gallery is not mis-read as one image)", async () => {
    const html = `<figure class="wp-block-gallery"><figure class="wp-block-image"><img src="https://cdn/a.jpg"/></figure><figure class="wp-block-image"><img src="https://cdn/b.jpg"/></figure></figure>`;
    const result = await detectWxrCard(html);
    expect(result?.block.type).toBe("gallery");
  });
});

describe("detectWxrCard — button", () => {
  it("maps a wp-block-button to a buttons block", async () => {
    const html = `<div class="wp-block-button"><a class="wp-block-button__link" href="https://example.com/go">Click me</a></div>`;
    const result = await detectWxrCard(html);
    expect(result?.block).toEqual({
      type: "buttons",
      content: { align: "left", items: [{ label: "Click me", href: "https://example.com/go", variant: "solid", target: "_self" }] },
    });
  });
});

describe("detectWxrCard — embed", () => {
  it("maps a wp-block-embed YouTube URL to an embed block", async () => {
    const html = `<figure class="wp-block-embed is-provider-youtube"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=dQw4w9WgXcQ</div></figure>`;
    const result = await detectWxrCard(html);
    expect(result?.block.type).toBe("embed");
    const content = result?.block.content as { provider: string; url: string };
    expect(content.provider).toBe("youtube");
    expect(content.url).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("falls back to a labeled link + issue for an unsupported embed", async () => {
    const html = `<figure class="wp-block-embed"><div class="wp-block-embed__wrapper">https://example.com/unsupported</div></figure>`;
    const result = await detectWxrCard(html);
    expect(result?.block.type).toBe("buttons");
    expect(result?.issues.some((i) => i.kind === "embed-unsupported")).toBe(true);
  });
});

describe("detectWxrCard — fallthrough", () => {
  it("returns null for an unrecognized element (→ richtext fallback)", async () => {
    expect(await detectWxrCard(`<p>Just a paragraph</p>`)).toBeNull();
    expect(await detectWxrCard(`<div class="something-else"><span>x</span></div>`)).toBeNull();
  });
});
