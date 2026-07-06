import { parse, type HTMLElement } from "node-html-parser";
import type { CardResult, ParseIssue } from "../shared/types";

/**
 * Maps Substack's post-body HTML structures to native OYS blocks, mirroring
 * ghost/card-detect.ts. Substack renders its editor content with stable class
 * hooks — `captioned-image-container` for images, `.button`/`a.button` for
 * link buttons, `.subscribe-widget` for the inline subscribe band, and
 * `<pullquote>` for pull quotes. Anything unrecognized returns null so the
 * caller wraps it in richtext unchanged. Every extraction is defensive: a
 * structure missing its expected fields is treated as unrecognized, never
 * partially built.
 */
export async function detectSubstackCard(elementHtml: string): Promise<CardResult | null> {
  const root = parse(elementHtml);
  const el = root.firstChild as HTMLElement | undefined;
  if (!el || typeof el.classList === "undefined") return null;
  const classes = el.classList.value;
  const tag = el.rawTagName?.toLowerCase() ?? "";

  // Substack's image: <div class="captioned-image-container"><figure><img/><figcaption/></figure></div>
  if (classes.includes("captioned-image-container")) return detectImage(el);
  // A bare <figure> (some Substack embeds/images) with an <img>.
  if (tag === "figure" && el.querySelector("img")) return detectImage(el);

  // Subscribe band → newsletter block (all fields carry sensible defaults).
  if (classes.includes("subscribe-widget")) return detectSubscribe(el);

  // Link button: <p class="button-wrapper"><a class="button ...">…</a></p> or a bare a.button.
  if (classes.includes("button") || classes.includes("button-wrapper") || el.querySelector("a.button")) {
    const button = detectButton(el);
    if (button) return button;
  }

  return null;
}

function detectImage(el: HTMLElement): CardResult | null {
  const img = el.querySelector("img");
  // Substack lazy-loads: the real URL is often on data-src / the srcset, with
  // src a placeholder. Prefer a concrete https src, then data-src, then srcset.
  const src =
    firstHttps(img?.getAttribute("src")) ??
    firstHttps(img?.getAttribute("data-src")) ??
    firstFromSrcset(img?.getAttribute("srcset")) ??
    img?.getAttribute("src") ??
    img?.getAttribute("data-src");
  if (!src) return null;
  const caption = el.querySelector("figcaption")?.text.trim() ?? "";
  return {
    block: { type: "image", content: { src, alt: img?.getAttribute("alt") ?? "", caption } },
    issues: [],
  };
}

function detectButton(el: HTMLElement): CardResult | null {
  const a = el.rawTagName?.toLowerCase() === "a" ? el : el.querySelector("a.button") ?? el.querySelector("a");
  const href = a?.getAttribute("href");
  if (!a || !href) return null;
  // Substack subscribe buttons point back at the publication; keep them as a
  // link button (the reader can still follow it) — no special-casing needed.
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

function detectSubscribe(el: HTMLElement): CardResult | null {
  // The newsletter block's fields all default (newsletterSchema.parse({})), so
  // a subscribe widget maps cleanly with no content to salvage. Carry over the
  // widget's own heading/CTA text when Substack included it, else fall through
  // to the block's defaults.
  const heading = el.querySelector("h2, h3, .subscribe-widget__heading")?.text.trim();
  const cta = el.querySelector("button, a.button, input[type=submit]")?.text.trim();
  const content: Record<string, unknown> = {};
  if (heading) content.title = heading.slice(0, 120);
  if (cta) content.cta = cta.slice(0, 40);
  const issues: ParseIssue[] = [
    { kind: "subscribe-widget-mapped", detail: "A Substack subscribe widget was imported as a newsletter block wired to your default list" },
  ];
  return { block: { type: "newsletter", content }, issues };
}

/** Return the value only if it's an https URL, else undefined. */
function firstHttps(v: string | null | undefined): string | undefined {
  return v && /^https:\/\//i.test(v) ? v : undefined;
}

/** The last (largest) candidate from a srcset, if it's https. */
function firstFromSrcset(srcset: string | null | undefined): string | undefined {
  if (!srcset) return undefined;
  const candidates = srcset
    .split(",")
    .map((c) => c.trim().split(/\s+/)[0])
    .filter((u): u is string => Boolean(u) && /^https:\/\//i.test(u));
  return candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
}
