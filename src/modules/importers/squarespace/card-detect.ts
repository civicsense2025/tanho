import { parse, type HTMLElement } from "node-html-parser";
import { detectWxrCard, type CardResult } from "@/modules/importers/wxr/card-detect";

/**
 * Squarespace's WXR export is WordPress-compatible, but its `content:encoded`
 * bodies carry Squarespace's own block markup rather than Gutenberg's:
 * `<div class="sqs-block sqs-block-image">…<img data-src="…squarespace-cdn.com/…?format=1000w" src="data:…placeholder">`
 * and `<div class="sqs-gallery">…`. This detector recognizes those SQSP shapes
 * first (preferring the real `data-src` over the lazy-load placeholder,
 * keeping the `?format=` query the CDN needs, rejecting `data:` placeholders),
 * then delegates anything it doesn't specially handle to the shared WordPress
 * detector — so a Squarespace export that happens to contain plain Gutenberg
 * markup still maps correctly.
 */
export async function detectSquarespaceCard(elementHtml: string): Promise<CardResult | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (el && typeof el.classList !== "undefined") {
    const classes = el.classList.value;
    // Gallery before image (a gallery also contains <img>).
    if (classes.some((c) => c === "sqs-gallery" || c.startsWith("sqs-gallery-"))) {
      const gallery = detectSquarespaceGallery(el);
      if (gallery) return gallery;
    }
    if (classes.includes("sqs-block-image") || classes.includes("image-block") || classes.includes("image-block-outer-wrapper")) {
      const image = detectSquarespaceImage(el);
      if (image) return image;
    }
  }
  // After the wrapper pre-clean (map.ts), a SQSP image is a bare <figure>/<img>
  // that lost its sqs-block-image class — but still carries the tell-tale
  // lazy-load `data-src`. Claim that here (a plain WP <figure> with a normal
  // `src` and no `data-src` still falls through to the shared detector).
  if (el && (el.rawTagName === "figure" || el.rawTagName === "img")) {
    const img = el.rawTagName === "img" ? el : el.querySelector("img");
    if (img?.getAttribute("data-src")) {
      const image = detectSquarespaceImage(el);
      if (image) return image;
    }
  }
  // Not a recognized SQSP shape — fall back to shared WordPress detection.
  return detectWxrCard(elementHtml);
}

/** Read the real image URL: prefer `data-src` (SQSP lazy-loads with a `data:`
 *  placeholder in `src`), reject `data:` URIs, keep `?format=` query params. */
function realSquarespaceSrc(img: HTMLElement | null | undefined): string {
  if (!img) return "";
  const dataSrc = img.getAttribute("data-src")?.trim();
  const src = img.getAttribute("src")?.trim() ?? "";
  if (dataSrc && !dataSrc.startsWith("data:")) return dataSrc;
  if (src && !src.startsWith("data:")) return src;
  return "";
}

function detectSquarespaceImage(el: HTMLElement): CardResult | null {
  const img = el.rawTagName === "img" ? el : el.querySelector("img");
  const src = realSquarespaceSrc(img);
  if (!src) return null;
  const caption =
    el.querySelector("figcaption")?.text.trim() ??
    el.querySelector(".image-caption")?.text.trim() ??
    "";
  const alt = img?.getAttribute("alt") ?? img?.getAttribute("data-image-alt") ?? "";
  return { block: { type: "image", content: { src, alt, caption } }, issues: [] };
}

function detectSquarespaceGallery(el: HTMLElement): CardResult | null {
  const imgs = el.querySelectorAll("img");
  const images = imgs
    .map((img) => ({ src: realSquarespaceSrc(img), alt: img.getAttribute("alt") ?? "", caption: "" }))
    .filter((i) => i.src);
  if (images.length === 0) return null;
  return {
    block: {
      type: "gallery",
      content: { cols: Math.min(4, Math.max(2, images.length >= 3 ? 3 : 2)), images },
    },
    issues: [],
  };
}
