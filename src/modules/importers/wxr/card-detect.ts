import { parse, type HTMLElement } from "node-html-parser";
import { resolveEmbedUrl } from "@/modules/embeds/resolve";
import { safeHref } from "@/modules/importers/shared/safe-href";
import type { ParseIssue } from "./parse";

export type DetectedBlock = { type: string; content: Record<string, unknown> };
export type CardResult = { block: DetectedBlock; issues: ParseIssue[] };

/**
 * Maps the common WordPress-rendered HTML structures found in a WXR
 * `content:encoded` body — Gutenberg block markup (`wp-block-image`,
 * `wp-block-gallery`, `wp-block-button`, `wp-block-embed`) and the classic
 * `[caption]` shortcode render (`wp-caption`) — to native Lamina blocks, instead
 * of stuffing every top-level element into one richtext blob. Anything that
 * doesn't match a known structure returns null; the caller falls back to
 * wrapping the element in richtext (sanitized at render). Every extraction is
 * defensive: a structure whose expected fields are missing is treated as
 * unrecognized, never partially built — mirroring the Ghost importer's
 * card-detect.ts contract. Remote image URLs are preserved as-is (no
 * re-hosting), matching Ghost.
 */
export async function detectWxrCard(elementHtml: string): Promise<CardResult | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (!el || typeof el.classList === "undefined") return null;
  const classes = el.classList.value;

  // Gallery must be checked before image: a gallery figure also contains
  // <img>, so an image-first order would mis-detect it as a single image.
  if (classes.includes("wp-block-gallery")) return detectGallery(el);
  if (classes.includes("wp-block-image")) return detectImage(el);
  if (classes.includes("wp-caption")) return detectImage(el); // classic [caption] render
  // A single button OR the `wp-block-buttons` group wrapper (Gutenberg always
  // nests <div class="wp-block-buttons"><div class="wp-block-button"><a>…). The
  // wrapper is the top-level element, so match it too — its class is a distinct
  // token from "wp-block-button", so an exact-token `includes` misses it.
  if (classes.includes("wp-block-buttons") || classes.includes("wp-block-button")) return detectButton(el);
  if (classes.includes("wp-block-embed")) return detectEmbed(el);

  return null;
}

/** Read the meaningful image src, ignoring a lazy-load placeholder if a real
 *  one is present. Shared with the Squarespace detector's needs (data-src). */
function realImageSrc(img: HTMLElement | null | undefined): string {
  if (!img) return "";
  const dataSrc = img.getAttribute("data-src");
  const src = img.getAttribute("src") ?? "";
  // Prefer a real src; fall back to data-src only when src is a data: URI
  // placeholder or absent. Reject data: URIs outright (never a real asset).
  if (src && !src.startsWith("data:")) return src;
  if (dataSrc && !dataSrc.startsWith("data:")) return dataSrc;
  return src.startsWith("data:") ? "" : src;
}

function detectImage(el: HTMLElement): CardResult | null {
  const img = el.querySelector("img");
  const src = realImageSrc(img);
  if (!src) return null;
  // wp-block-image uses <figcaption>; classic wp-caption uses .wp-caption-text.
  const caption =
    el.querySelector("figcaption")?.text.trim() ??
    el.querySelector(".wp-caption-text")?.text.trim() ??
    "";
  return {
    block: { type: "image", content: { src, alt: img?.getAttribute("alt") ?? "", caption } },
    issues: [],
  };
}

function detectGallery(el: HTMLElement): CardResult | null {
  const imgs = el.querySelectorAll("img");
  const images = imgs
    .map((img) => ({ src: realImageSrc(img), alt: img.getAttribute("alt") ?? "", caption: "" }))
    .filter((i) => i.src);
  if (images.length === 0) return null;
  // A gallery's own <figcaption> (if any) describes the whole gallery — attach
  // it to the first image so it isn't silently dropped, matching Ghost.
  const sharedCaption = el.querySelector("figure > figcaption")?.text.trim() ?? "";
  if (sharedCaption && images[0]) images[0].caption = sharedCaption;
  return {
    block: {
      type: "gallery",
      content: { cols: Math.min(4, Math.max(2, images.length >= 3 ? 3 : 2)), images },
    },
    issues: [],
  };
}

function detectButton(el: HTMLElement): CardResult | null {
  // A `wp-block-buttons` wrapper can hold several buttons; collect every anchor
  // with a safe href so a button group maps to one buttons block with N items.
  const items = el
    .querySelectorAll("a")
    .map((a) => ({ a, href: safeHref(a.getAttribute("href")) }))
    .filter((x): x is { a: HTMLElement; href: string } => Boolean(x.href));
  if (items.length === 0) return null;
  return {
    block: {
      type: "buttons",
      content: {
        align: "left",
        items: items.map(({ a, href }) => ({
          label: a.text.trim() || "Button",
          href,
          variant: "solid",
          target: "_self",
        })),
      },
    },
    issues: [],
  };
}

async function detectEmbed(el: HTMLElement): Promise<CardResult | null> {
  // WordPress renders an embed as <figure class="wp-block-embed">
  // <div class="wp-block-embed__wrapper">URL-or-iframe</div></figure>. The
  // wrapper text is often a bare provider URL; sometimes it's a resolved
  // <iframe src>. Twitter/X may render as a <blockquote><a href>. Try each.
  const iframeSrc = el.querySelector("iframe")?.getAttribute("src");
  const wrapperText = el.querySelector(".wp-block-embed__wrapper")?.text.trim();
  const linkHref = el.querySelector("a")?.getAttribute("href");
  const candidate = iframeSrc || wrapperText || linkHref;
  if (!candidate) return null;

  const resolved = await resolveEmbedUrl(candidate);
  if (!resolved.ok) {
    // Unsupported/unresolvable provider — fall back to a labeled link rather
    // than dropping the embed, matching Ghost's detectEmbed fallback.
    const href = safeHref(candidate);
    if (!href) return null;
    let hostname = "the source";
    try {
      hostname = new URL(candidate).hostname;
    } catch {
      // candidate wasn't a valid absolute URL — keep the generic label.
    }
    return {
      block: {
        type: "buttons",
        content: {
          align: "left",
          items: [{ label: `View on ${hostname}`, href, variant: "outline", target: "_blank" }],
        },
      },
      issues: [{ kind: "embed-unsupported", detail: `Embed from ${hostname} has no supported provider; imported as a link` }],
    };
  }

  return {
    block: { type: "embed", content: { provider: resolved.provider, url: resolved.url, ratio: "16 / 9" } },
    issues: [],
  };
}
