import { parse, type HTMLElement } from "node-html-parser";
import { resolveEmbedUrl } from "@/modules/embeds/resolve";
import type { ParseIssue } from "./parse";

export type DetectedBlock = { type: string; content: Record<string, unknown> };

/**
 * Maps Ghost's kg-*-card HTML structures (confirmed against Ghost's own
 * renderer source, TryGhost/Koenig) to native OYS blocks, instead of
 * stuffing every top-level element into one richtext blob. Anything that
 * doesn't match a known card class returns null — the caller falls back to
 * wrapping the element in richtext, unchanged from before this module
 * existed. Every extraction is defensive: a card whose expected fields are
 * missing/malformed is treated as unrecognized, never partially built.
 */
export async function detectCard(elementHtml: string): Promise<{ block: DetectedBlock; issues: ParseIssue[] } | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (!el || typeof el.classList === "undefined") return null;
  const classes = el.classList.value;

  if (classes.includes("kg-image-card")) return detectImage(el);
  if (classes.includes("kg-gallery-card")) return detectGallery(el);
  if (classes.includes("kg-callout-card")) return detectCallout(el);
  // Ghost's button card has no plain "kg-button-card"/"kg-btn-card" class —
  // it's "kg-card kg-btn-wide" or "kg-card kg-btn-regular" (confirmed
  // against button-renderer.ts's getCardClasses), so this needs a
  // substring/prefix check, not an exact-element match like the others.
  if (classes.some((c) => c.startsWith("kg-btn-"))) return detectButton(el);
  if (classes.includes("kg-bookmark-card")) return detectBookmark(el);
  if (classes.includes("kg-embed-card")) return detectEmbed(el);

  return null;
}

function detectImage(el: HTMLElement): { block: DetectedBlock; issues: ParseIssue[] } | null {
  const img = el.querySelector("img");
  const src = img?.getAttribute("src");
  if (!src) return null;
  const caption = el.querySelector("figcaption")?.text.trim() ?? "";
  return {
    block: {
      type: "image",
      content: { src, alt: img?.getAttribute("alt") ?? "", caption },
    },
    issues: [],
  };
}

function detectGallery(el: HTMLElement): { block: DetectedBlock; issues: ParseIssue[] } | null {
  const imgs = el.querySelectorAll("img");
  const images = imgs
    .map((img) => ({ src: img.getAttribute("src") ?? "", alt: img.getAttribute("alt") ?? "", caption: "" }))
    .filter((i) => i.src);
  if (images.length === 0) return null;
  // Ghost's gallery has ONE shared figcaption for the whole gallery, not one
  // per image — attached to the first image so it's not silently dropped;
  // there's no per-image caption to preserve from Ghost's own structure.
  const sharedCaption = el.querySelector("figcaption")?.text.trim() ?? "";
  if (sharedCaption && images[0]) images[0].caption = sharedCaption;
  return {
    block: { type: "gallery", content: { cols: Math.min(4, Math.max(2, images.length >= 3 ? 3 : 2)), images } },
    issues: [],
  };
}

const CALLOUT_TONE: Record<string, "info" | "tip" | "warning" | "danger"> = {
  blue: "info",
  green: "tip",
  yellow: "warning",
  orange: "warning",
  red: "danger",
  pink: "info",
  purple: "info",
  grey: "info",
  gray: "info",
  white: "info",
};

function detectCallout(el: HTMLElement): { block: DetectedBlock; issues: ParseIssue[] } | null {
  const textEl = el.querySelector(".kg-callout-text");
  const body = textEl?.text.trim() ?? "";
  if (!body) return null;
  const colorClass = el.classList.value.find((c) => c.startsWith("kg-callout-card-"));
  const color = colorClass?.replace("kg-callout-card-", "") ?? "white";
  const tone = CALLOUT_TONE[color] ?? "info";
  const emoji = el.querySelector(".kg-callout-emoji")?.text.trim() ?? "";
  return {
    block: { type: "callout", content: { tone, title: emoji, body } },
    issues: color in CALLOUT_TONE
      ? []
      : [{ kind: "callout-color-unmapped", detail: `Callout color "${color}" isn't a known Ghost color; defaulted to "info"` }],
  };
}

function detectButton(el: HTMLElement): { block: DetectedBlock; issues: ParseIssue[] } | null {
  const a = el.querySelector("a.kg-btn");
  const href = a?.getAttribute("href");
  if (!a || !href) return null;
  return {
    block: {
      type: "buttons",
      content: {
        align: "left",
        items: [{ label: a.text.trim() || "Button", href, variant: "solid", target: "_self" }],
      },
    },
    issues: [],
  };
}

function detectBookmark(el: HTMLElement): { block: DetectedBlock; issues: ParseIssue[] } | null {
  // Ghost's bookmark card has no native OYS equivalent — fall back to a
  // labeled link (buttons block), keeping the title + url, losing the rich
  // preview (description/thumbnail/publisher). See map.ts's docs for why.
  const container = el.querySelector("a.kg-bookmark-container");
  const href = container?.getAttribute("href");
  if (!href) return null;
  const title = el.querySelector(".kg-bookmark-title")?.text.trim() || href;
  return {
    block: {
      type: "buttons",
      content: { align: "left", items: [{ label: title, href, variant: "outline", target: "_blank" }] },
    },
    issues: [{ kind: "bookmark-downgraded", detail: `Bookmark "${title}" imported as a plain link — no bookmark block exists` }],
  };
}

async function detectEmbed(el: HTMLElement): Promise<{ block: DetectedBlock; issues: ParseIssue[] } | null> {
  // Two real shapes here (confirmed against Ghost's own renderer source,
  // TryGhost/Koenig): most providers (YouTube/Vimeo/Maps/Figma/Spotify)
  // render as a bare <iframe> whose src is already the provider's resolved
  // embed-form URL — our resolver's sync providers already tolerate an
  // already-resolved URL passed back through them. Twitter is the one
  // exception: Ghost's non-email render path passes `node.html` through
  // UNCHANGED (twitter.ts's renderer only rewrites it for email target),
  // and that html is Twitter's own oEmbed response — the documented
  // <blockquote class="twitter-tweet"><a href="{tweetUrl}">...</a></blockquote>
  // shape — so the tweet URL is recoverable from that anchor's href.
  const iframeSrc = el.querySelector("iframe")?.getAttribute("src");
  const linkHref = el.querySelector("a")?.getAttribute("href");
  const candidate = iframeSrc ?? linkHref;
  if (!candidate) return null;

  const resolved = await resolveEmbedUrl(candidate);
  if (!resolved.ok) {
    // Unsupported/unresolvable provider — fall back to a labeled link
    // rather than silently dropping the embed.
    let hostname = "the source";
    try {
      hostname = new URL(candidate).hostname;
    } catch {
      // candidate wasn't a valid absolute URL — keep the generic label.
    }
    return {
      block: {
        type: "buttons",
        content: { align: "left", items: [{ label: `View on ${hostname}`, href: candidate, variant: "outline", target: "_blank" }] },
      },
      issues: [{ kind: "embed-unsupported", detail: `Embed from ${hostname} has no supported provider; imported as a link` }],
    };
  }

  return {
    block: { type: "embed", content: { provider: resolved.provider, url: resolved.url, ratio: "16 / 9" } },
    issues: [],
  };
}
