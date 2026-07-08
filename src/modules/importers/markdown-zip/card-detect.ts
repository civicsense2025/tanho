import { parse, type HTMLElement } from "node-html-parser";
import type { CardResult } from "@/modules/importers/shared/types";

/**
 * Element→block detector for markdown imports. markdownToSafeHtml (parse.ts) emits
 * clean structural HTML — `<p>/<h2>/<h3>/<figure>/<img>/<blockquote>/<ul>` etc. The
 * only element with a richer native Lamina home than richtext is an image: a top-level
 * `<figure><img>…</figure>` (markdown `![alt](src)` inside a figure) or a bare
 * top-level `<img>` maps to an `image` block. Everything else returns null and falls
 * through to richtext, matching the Ghost/WXR card-detect contract. Defensive: an
 * <img> with no usable src is treated as unrecognized, never partially built.
 */
export async function detectMarkdownCard(elementHtml: string): Promise<CardResult | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (!el || typeof el.tagName === "undefined") return null;

  const tag = el.tagName.toUpperCase();
  if (tag !== "FIGURE" && tag !== "IMG") return null;

  // A bare <img> is its own image; a <figure> carries an <img> + optional <figcaption>.
  const img = tag === "IMG" ? el : el.querySelector("img");
  const src = img?.getAttribute("src");
  if (!src) return null;

  const caption = el.querySelector("figcaption")?.text.trim() ?? "";
  return {
    block: { type: "image", content: { src, alt: img?.getAttribute("alt") ?? "", caption } },
    issues: [],
  };
}
