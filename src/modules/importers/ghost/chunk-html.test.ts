import { describe, expect, it } from "vitest";
import { chunkHtmlAtTopLevelBoundaries, splitIntoTopLevelElements } from "./chunk-html";

describe("chunkHtmlAtTopLevelBoundaries", () => {
  it("returns the whole string as one chunk when it's already under the limit", () => {
    const html = "<p>short</p>";
    expect(chunkHtmlAtTopLevelBoundaries(html, 1000)).toEqual([html]);
  });

  it("splits at a boundary between two flat top-level paragraphs", () => {
    const p1 = `<p>${"a".repeat(50)}</p>`;
    const p2 = `<p>${"b".repeat(50)}</p>`;
    const chunks = chunkHtmlAtTopLevelBoundaries(p1 + p2, 60);
    expect(chunks).toEqual([p1, p2]);
    expect(chunks.join("")).toBe(p1 + p2); // no content lost or duplicated
  });

  it("never splits inside a nested element — a figure containing an img+figcaption stays whole", () => {
    const figure = `<figure><img src="x.jpg"><figcaption>${"c".repeat(80)}</figcaption></figure>`;
    const p = `<p>${"a".repeat(50)}</p>`;
    const chunks = chunkHtmlAtTopLevelBoundaries(figure + p, 60);
    // The figure element (with its nested img/figcaption) must appear intact
    // in some chunk — never truncated mid-tag or mid-nested-element.
    expect(chunks.some((c) => c === figure)).toBe(true);
    expect(chunks.join("")).toBe(figure + p);
  });

  it("keeps a single element larger than maxChars whole rather than corrupting it", () => {
    const huge = `<pre>${"x".repeat(500)}</pre>`;
    const chunks = chunkHtmlAtTopLevelBoundaries(huge, 100);
    expect(chunks).toEqual([huge]); // exceeds maxChars, but never truncated mid-tag
  });

  it("handles void/self-closing elements without miscounting nesting depth", () => {
    const p1 = `<p>before<br>after ${"z".repeat(50)}</p>`;
    const p2 = `<p>${"y".repeat(50)}</p>`;
    const chunks = chunkHtmlAtTopLevelBoundaries(p1 + p2, 70);
    expect(chunks.join("")).toBe(p1 + p2);
    // p1 (with its <br>) must stay intact — a miscounted <br> as a real
    // "open" tag would leave depth > 0 forever and prevent any split at all.
    expect(chunks.some((c) => c.includes("<br>"))).toBe(true);
  });

  it("handles a self-closing XHTML-style void tag (<img ... />)", () => {
    const p1 = `<p><img src="a.jpg" />${"a".repeat(50)}</p>`;
    const p2 = `<p>${"b".repeat(50)}</p>`;
    const chunks = chunkHtmlAtTopLevelBoundaries(p1 + p2, 70);
    expect(chunks.join("")).toBe(p1 + p2);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("splits many small top-level elements into multiple bounded chunks", () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `<p>para ${i} ${"x".repeat(20)}</p>`);
    const html = paragraphs.join("");
    const chunks = chunkHtmlAtTopLevelBoundaries(html, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(html); // every paragraph preserved, none lost/duplicated
    for (const c of chunks.slice(0, -1)) {
      // every non-final chunk should respect the limit (final chunk may be
      // shorter or, if a single element exceeds the limit, longer — see the
      // "keeps a single element whole" case).
      expect(c.length).toBeLessThanOrEqual(50 + 30); // small tolerance for the boundary-detection window
    }
  });

  it("falls back to the whole string when no top-level boundary exists at all (malformed/unclosed markup)", () => {
    const malformed = `<div>${"x".repeat(500)}`; // never closes
    const chunks = chunkHtmlAtTopLevelBoundaries(malformed, 100);
    expect(chunks).toEqual([malformed]);
  });

  it("preserves ordering and total content across many chunks", () => {
    const items = Array.from({ length: 30 }, (_, i) => `<p>item-${i}</p>`);
    const html = items.join("");
    const chunks = chunkHtmlAtTopLevelBoundaries(html, 40);
    expect(chunks.join("")).toBe(html);
    // Reconstruct the item order from the concatenated chunks and confirm nothing shuffled.
    const reconstructed = chunks.join("").match(/item-\d+/g);
    expect(reconstructed).toEqual(items.map((_, i) => `item-${i}`));
  });
});

describe("splitIntoTopLevelElements", () => {
  it("splits three flat top-level elements into three individual entries", () => {
    const els = ["<p>one</p>", "<figure><img src=\"x.jpg\"></figure>", "<p>two</p>"];
    expect(splitIntoTopLevelElements(els.join(""))).toEqual(els);
  });

  it("keeps a nested element's children inside its own single entry", () => {
    const figure = `<figure><div class="kg-gallery-container"><div class="kg-gallery-row"><img src="a.jpg"></div></div></figure>`;
    expect(splitIntoTopLevelElements(figure)).toEqual([figure]);
  });

  it("returns an empty array for an empty string", () => {
    expect(splitIntoTopLevelElements("")).toEqual([]);
  });

  it("returns the whole string as one element when no boundary exists (malformed markup)", () => {
    const malformed = "<div>unclosed";
    expect(splitIntoTopLevelElements(malformed)).toEqual([malformed]);
  });

  it("does not batch by size — every element is its own entry regardless of length", () => {
    const tiny = "<p>a</p>";
    const huge = `<p>${"x".repeat(5000)}</p>`;
    expect(splitIntoTopLevelElements(tiny + huge)).toEqual([tiny, huge]);
  });
});
