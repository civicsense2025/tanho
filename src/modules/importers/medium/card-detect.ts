import { parse, type HTMLElement } from "node-html-parser";
import { resolveEmbedUrl } from "@/modules/embeds/resolve";
import type { CardResult } from "@/modules/importers/shared/types";

/**
 * Maps Medium's exported story markup (the `graf--*` classes Medium's own
 * exporter emits) to native OYS blocks instead of stuffing every top-level
 * element into one richtext blob:
 *   - `<figure class="graf--figure">` (or any top-level `<figure>` with an
 *     `<img>`) → an `image` block (src + `<figcaption>` → caption),
 *   - `.graf--pullquote` / a top-level `<blockquote>` → a `quote` block,
 *   - `.graf--mixtapeEmbed` / a top-level `<figure>` with an `<iframe>` →
 *     an `embed` block, resolved through the shared embed resolver EXACTLY
 *     like the Ghost importer's embed card (async; may make a network call).
 * Anything else returns null and falls through to richtext, matching the
 * Ghost/WXR card-detect contract. Every extraction is defensive: a card whose
 * expected fields are missing/malformed is treated as unrecognized, never
 * partially built.
 */
export async function detectMediumCard(elementHtml: string): Promise<CardResult | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (!el || typeof el.tagName === "undefined") return null;

  const tag = el.tagName.toUpperCase();
  const classes: string[] = typeof el.classList === "undefined" ? [] : el.classList.value;
  const has = (c: string) => classes.includes(c);

  // Embeds first: a mixtape embed (Medium's link/embed card) or a <figure>
  // whose payload is an <iframe> (YouTube/Vimeo/etc.) is an embed, not an image.
  if (has("graf--mixtapeEmbed") || (tag === "FIGURE" && el.querySelector("iframe"))) {
    return detectEmbed(el);
  }

  // Pullquotes: Medium marks them with graf--pullquote (on a <blockquote> or a
  // wrapping element); a bare top-level <blockquote> is also a quote.
  if (has("graf--pullquote") || tag === "BLOCKQUOTE") {
    return detectQuote(el);
  }

  // Images: figure.graf--figure, or any top-level <figure>/<img> with a usable src.
  if (has("graf--figure") || tag === "FIGURE" || tag === "IMG") {
    return detectImage(el, tag);
  }

  return null;
}

function detectImage(el: HTMLElement, tag: string): CardResult | null {
  const img = tag === "IMG" ? el : el.querySelector("img");
  const src = img?.getAttribute("src");
  if (!src) return null;
  const caption = el.querySelector("figcaption")?.text.trim() ?? "";
  return {
    block: { type: "image", content: { src, alt: img?.getAttribute("alt") ?? "", caption } },
    issues: [],
  };
}

function detectQuote(el: HTMLElement): CardResult | null {
  // The quote text may live directly on the pullquote element or on an inner
  // <blockquote>; take whichever has text. quote/fields.ts's content keys are
  // { text, cite } — Medium pullquotes carry no attribution, so cite stays "".
  const inner = el.querySelector("blockquote");
  const text = (inner?.text ?? el.text).trim();
  if (!text) return null;
  return {
    block: { type: "quote", content: { text, cite: "" } },
    issues: [],
  };
}

async function detectEmbed(el: HTMLElement): Promise<CardResult | null> {
  // Mirrors ghost/card-detect.ts's detectEmbed: most providers render as a
  // bare <iframe> whose src is already the provider's resolved embed URL (our
  // resolver tolerates an already-resolved URL passed back through it); a
  // mixtape embed keeps the source link on an <a> whose href is the share URL.
  const iframeSrc = el.querySelector("iframe")?.getAttribute("src");
  const linkHref = el.querySelector("a")?.getAttribute("href");
  const candidate = iframeSrc ?? linkHref;
  if (!candidate) return null;

  const resolved = await resolveEmbedUrl(candidate);
  if (!resolved.ok) {
    // Unsupported/unresolvable provider — fall back to a labeled link rather
    // than silently dropping the embed.
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
