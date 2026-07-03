import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseBlocks } from "@/lib/blocks/core/validate";

// parseBlocks is the trust boundary that replaced app/page.tsx's unchecked JSON.parse. Its
// contract: never throw, drop malformed/unknown blocks, support both on-disk shapes, fill
// schema defaults for content blocks.
beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("parseBlocks", () => {
  it("returns [] for invalid JSON instead of throwing", () => {
    expect(parseBlocks("{ not json")).toEqual([]);
  });

  it("returns [] when there is no blocks array", () => {
    expect(parseBlocks(JSON.stringify({ nope: 1 }))).toEqual([]);
    expect(parseBlocks("null")).toEqual([]);
  });

  it("parses data-bound homepage blocks ({type, props}) into content", () => {
    const raw = JSON.stringify({
      blocks: [{ type: "profile-header", props: { name: "Tan", bio: "hi" } }],
    });
    const out = parseBlocks(raw);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("profile-header");
    expect(out[0].content).toEqual({ name: "Tan", bio: "hi" });
  });

  it("validates content blocks against their spec and fills defaults", () => {
    const raw = JSON.stringify({ blocks: [{ type: "gallery", content: {} }] });
    const out = parseBlocks(raw);
    expect(out).toHaveLength(1);
    // gallery schema defaults images to [].
    expect(out[0].content).toEqual({ images: [] });
  });

  it("drops a content block whose content violates its schema, keeps the rest", () => {
    const raw = JSON.stringify({
      blocks: [
        { type: "gallery", content: { images: "not-an-array" } },
        { type: "text", content: { html: "ok" } },
      ],
    });
    const out = parseBlocks(raw);
    expect(out.map((b) => b.type)).toEqual(["text"]);
  });

  it("drops a structurally malformed block (missing type)", () => {
    const raw = JSON.stringify({ blocks: [{ content: {} }, { type: "text", content: {} }] });
    expect(parseBlocks(raw).map((b) => b.type)).toEqual(["text"]);
  });

  it("carries through valid style and variant", () => {
    const raw = JSON.stringify({
      blocks: [{ type: "gallery", content: { images: [] }, style: { columns: 3 }, variant: "grid-3" }],
    });
    const out = parseBlocks(raw);
    expect(out[0].style).toEqual({ columns: 3 });
    expect(out[0].variant).toBe("grid-3");
  });

  it("drops a block carrying invalid style (out-of-range columns)", () => {
    const raw = JSON.stringify({
      blocks: [{ type: "gallery", content: { images: [] }, style: { columns: 99 } }],
    });
    // style fails styleSchema (max 6) → whole block dropped by the outer rawBlockSchema.
    expect(parseBlocks(raw)).toEqual([]);
  });

  it("degrades gracefully on a content_entries block-list field's bare array shape", () => {
    // A block-list field's stored value (content_entries.data.blocks) is a bare array, not the
    // {blocks: [...]} envelope parseBlocks expects -- the render-time call sites wrap it as
    // `parseBlocks({ blocks: data.blocks })`. This is a regression test for guides/[slug],
    // projects/[slug], and the generic [typeSlug]/[slug] route, which used to raw-cast
    // `data.blocks as Block[]` straight into <BlockTree> with zero validation -- a corrupted
    // block's invalid content would have failed however BlockTree/RenderContentBlock happens to
    // fail on bad input, untested and unhandled, instead of being dropped here as designed.
    const entryData = { title: "x", blocks: [{ type: "text", content: { html: "ok" } }, { type: "gallery", content: { images: "not-an-array" } }] };
    const out = parseBlocks({ blocks: entryData.blocks });
    expect(out.map((b) => b.type)).toEqual(["text"]);
  });

  it("carries through mobile-first responsive style (base + tablet/desktop overrides)", () => {
    const raw = JSON.stringify({
      blocks: [
        {
          type: "text",
          content: { html: "hi" },
          style: { padTop: "2", align: "center", tablet: { padTop: "6" }, desktop: { padTop: "12" } },
        },
      ],
    });
    const out = parseBlocks(raw);
    expect(out[0].style).toEqual({
      padTop: "2",
      align: "center",
      tablet: { padTop: "6" },
      desktop: { padTop: "12" },
    });
  });

  it("drops a block whose responsive override violates the schema, keeps siblings", () => {
    const raw = JSON.stringify({
      blocks: [
        { type: "text", content: { html: "keep" } },
        { type: "text", content: { html: "drop" }, style: { tablet: { padTop: "bogus-step" } } },
      ],
    });
    const out = parseBlocks(raw);
    // Only the first survives; the invalid tablet override fails styleSchema → whole block dropped.
    expect(out).toHaveLength(1);
    expect(out[0].content).toEqual({ html: "keep" });
  });
});
