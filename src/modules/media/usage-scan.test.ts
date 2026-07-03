import { describe, expect, it } from "vitest";
import { scanBlocksForMedia } from "./usage-scan";

const url = (key: string) => `/api/media/${key}`;

describe("scanBlocksForMedia", () => {
  it("collects src and poster from flat blocks", () => {
    const refs = scanBlocksForMedia([
      { id: "a", type: "image", content: { src: url("aaa111.jpg"), alt: "" } },
      { id: "b", type: "video", content: { src: url("bbb222.mp4"), poster: url("ccc333.webp") } },
    ]);
    expect(refs).toEqual([
      { storageKey: "aaa111.jpg", whereLabel: "image" },
      { storageKey: "bbb222.mp4", whereLabel: "video" },
      { storageKey: "ccc333.webp", whereLabel: "video" },
    ]);
  });

  it("collects src inside images[] and slides[] arrays", () => {
    const refs = scanBlocksForMedia([
      {
        id: "g",
        type: "gallery",
        content: { images: [{ src: url("g1.png") }, { src: url("g2.png") }, { src: "" }] },
      },
      { id: "c", type: "carousel", content: { slides: [{ src: url("s1.jpg"), caption: "x" }] } },
    ]);
    expect(refs.map((r) => r.storageKey)).toEqual(["g1.png", "g2.png", "s1.jpg"]);
    expect(refs[0].whereLabel).toBe("gallery");
  });

  it("recurses through nested container blocks", () => {
    const refs = scanBlocksForMedia([
      {
        id: "s",
        type: "section",
        content: {
          blocks: [
            {
              id: "r",
              type: "row",
              content: { blocks: [{ id: "i", type: "image", content: { src: url("deep1.gif") } }] },
            },
          ],
        },
      },
    ]);
    expect(refs).toEqual([{ storageKey: "deep1.gif", whereLabel: "image" }]);
  });

  it("ignores external URLs, non-media paths, and malformed keys", () => {
    const refs = scanBlocksForMedia([
      { id: "a", type: "image", content: { src: "https://example.com/a.jpg" } },
      { id: "b", type: "image", content: { src: "/uploads/a.jpg" } },
      { id: "c", type: "image", content: { src: "/api/media/../secret.jpg" } },
      { id: "d", type: "image", content: { src: "/api/media/a b.jpg" } },
      { id: "e", type: "image", content: { src: url("ok1.jpg") + "?x=1" } },
    ]);
    expect(refs).toEqual([]);
  });

  it("dedupes per (key, block type) but keeps distinct types", () => {
    const refs = scanBlocksForMedia([
      { id: "a", type: "image", content: { src: url("same1.jpg") } },
      { id: "b", type: "image", content: { src: url("same1.jpg") } },
      { id: "c", type: "hero", content: { src: url("same1.jpg") } },
    ]);
    expect(refs).toEqual([
      { storageKey: "same1.jpg", whereLabel: "image" },
      { storageKey: "same1.jpg", whereLabel: "hero" },
    ]);
  });

  it("survives junk nodes without throwing", () => {
    expect(scanBlocksForMedia([null, 42, "x", {}, { type: 7, content: null }])).toEqual([]);
  });
});
