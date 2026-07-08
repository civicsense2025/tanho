import { parse, type HTMLElement } from "node-html-parser";
import type { CardResult } from "../shared/types";

/**
 * Element→block detector for feed imports. Feed body HTML (`content:encoded` /
 * Atom `content`) is arbitrary author HTML, so richtext is the safe default for
 * almost everything. The one element with a richer native Lamina home is an image:
 * feeds routinely carry a top-level `<figure><img>…</figure>` (WordPress and
 * most CMSes emit this) or a bare top-level `<img>` — both map to an `image`
 * block, mirroring the Ghost/WXR/markdown detectImage contract. Everything else
 * returns null and falls through to richtext. Defensive: an <img> with no
 * usable src is treated as unrecognized, never partially built.
 */
export async function detectFeedCard(elementHtml: string): Promise<CardResult | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (!el || typeof el.tagName === "undefined") return null;

  const tag = el.tagName.toUpperCase();
  if (tag !== "FIGURE" && tag !== "IMG") return null;

  // A bare <img> is its own image; a <figure> carries an <img> + optional <figcaption>.
  const img = tag === "IMG" ? el : el.querySelector("img");
  const src = img?.getAttribute("src");
  // Reject data: URIs — never a real hosted asset.
  if (!src || src.startsWith("data:")) return null;

  const caption = el.querySelector("figcaption")?.text.trim() ?? "";
  return {
    block: { type: "image", content: { src, alt: img?.getAttribute("alt") ?? "", caption } },
    issues: [],
  };
}
