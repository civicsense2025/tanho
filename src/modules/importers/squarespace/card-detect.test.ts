import { describe, expect, it } from "vitest";
import { detectSquarespaceCard } from "./card-detect";
import { precleanSquarespaceHtml } from "./map";

describe("detectSquarespaceCard — image", () => {
  it("prefers data-src over a data: placeholder and keeps ?format=", async () => {
    const html = `<div class="sqs-block sqs-block-image"><div class="sqs-block-content"><figure><img data-src="https://images.squarespace-cdn.com/photo.jpg?format=1000w" src="data:image/gif;base64,PLACEHOLDER" alt="Y"/></figure></div></div>`;
    const result = await detectSquarespaceCard(html);
    expect(result?.block.type).toBe("image");
    expect(result?.block.content).toEqual({
      src: "https://images.squarespace-cdn.com/photo.jpg?format=1000w",
      alt: "Y",
      caption: "",
    });
  });

  it("returns null when only a data: placeholder is present (no real src)", async () => {
    const html = `<div class="sqs-block sqs-block-image"><div class="sqs-block-content"><img src="data:image/gif;base64,PLACEHOLDER"/></div></div>`;
    const result = await detectSquarespaceCard(html);
    expect(result).toBeNull();
  });

  it("reads a figcaption caption", async () => {
    const html = `<div class="sqs-block-image"><figure><img data-src="https://images.squarespace-cdn.com/a.jpg"/><figcaption>Nice</figcaption></figure></div>`;
    const result = await detectSquarespaceCard(html);
    expect(result?.block.content).toMatchObject({ src: "https://images.squarespace-cdn.com/a.jpg", caption: "Nice" });
  });
});

describe("detectSquarespaceCard — gallery", () => {
  it("collects multiple data-src images", async () => {
    const html = `<div class="sqs-gallery"><img data-src="https://images.squarespace-cdn.com/1.jpg" src="data:x"/><img data-src="https://images.squarespace-cdn.com/2.jpg" src="data:x"/></div>`;
    const result = await detectSquarespaceCard(html);
    expect(result?.block.type).toBe("gallery");
    const content = result?.block.content as { images: Array<{ src: string }> };
    expect(content.images.map((i) => i.src)).toEqual([
      "https://images.squarespace-cdn.com/1.jpg",
      "https://images.squarespace-cdn.com/2.jpg",
    ]);
  });
});

describe("detectSquarespaceCard — delegation", () => {
  it("falls back to the shared WordPress detector for plain Gutenberg markup", async () => {
    const html = `<figure class="wp-block-image"><img src="https://cdn/x.jpg" alt="X"/></figure>`;
    const result = await detectSquarespaceCard(html);
    expect(result?.block.type).toBe("image");
    expect(result?.block.content).toMatchObject({ src: "https://cdn/x.jpg" });
  });

  it("returns null for an unrecognized element", async () => {
    expect(await detectSquarespaceCard(`<p>text</p>`)).toBeNull();
  });

  it("returns null for a delegated Gutenberg button with a javascript: href", async () => {
    const html = `<div class="wp-block-button"><a class="wp-block-button__link" href="javascript:alert(1)">Hack</a></div>`;
    expect(await detectSquarespaceCard(html)).toBeNull();
  });
});

describe("precleanSquarespaceHtml", () => {
  it("unwraps sqs-block wrappers to their inner content", () => {
    const html = `<div class="sqs-block html-block"><div class="sqs-block-content"><p>Hello</p></div></div><div class="sqs-block sqs-block-image"><div class="sqs-block-content"><figure><img data-src="https://images.squarespace-cdn.com/x.jpg"/></figure></div></div>`;
    const { html: cleaned } = precleanSquarespaceHtml(html);
    // After unwrapping, the splitter sees a <p> and a <figure> at top level.
    expect(cleaned).toContain("<p>Hello</p>");
    expect(cleaned).toContain("<figure>");
    expect(cleaned).not.toContain("sqs-block-content");
  });

  it("leaves non-SQSP html untouched", () => {
    const html = `<p>Plain</p><h2>Heading</h2>`;
    expect(precleanSquarespaceHtml(html).html).toBe(html);
  });
});
