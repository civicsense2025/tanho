import { parse, type HTMLElement } from "node-html-parser";
import type { WxrItem } from "@/modules/importers/wxr/parse";
import { detectSquarespaceCard } from "./card-detect";
import type { WxrMapOptions } from "@/modules/importers/wxr/map";

/**
 * Squarespace body markup nests every block in a chrome of wrapper divs —
 * `<div class="sqs-block sqs-block-image"><div class="sqs-block-content">…`.
 * If those wrappers reach `splitIntoTopLevelElements` (in the shared mapper),
 * the whole body looks like a handful of giant top-level `<div>`s and both
 * card detection and richtext chunking degrade. This pre-clean unwraps each
 * top-level `sqs-block` wrapper to its meaningful inner element (the figure /
 * paragraph / heading inside `sqs-block-content`) so the shared splitter sees
 * real content elements at top level. Conservative: a wrapper whose inner
 * content can't be confidently isolated is left as-is (it then falls through
 * to richtext, which is still correct — just less "native").
 */
export function precleanSquarespaceHtml(html: string): { html: string; wrappersKept: number } {
  if (!html.includes("sqs-block")) return { html, wrappersKept: 0 };

  const root = parse(html);
  let wrappersKept = 0;
  const parts: string[] = [];

  for (const node of root.childNodes) {
    const el = node as HTMLElement;
    const classList = typeof el.classList !== "undefined" ? el.classList.value : undefined;
    if (classList && classList.includes("sqs-block")) {
      // Prefer the inner .sqs-block-content's children; fall back to the
      // wrapper's own children. Emit each inner element so the splitter can
      // see them individually.
      const content = el.querySelector(".sqs-block-content") ?? el;
      const inner = content.childNodes
        .map((c) => (c as HTMLElement).toString().trim())
        .filter(Boolean);
      if (inner.length > 0) {
        parts.push(inner.join(""));
      } else {
        // Nothing extractable — keep the wrapper whole (→ richtext fallback).
        parts.push(el.toString());
        wrappersKept++;
      }
    } else {
      const s = (node as HTMLElement).toString();
      if (s.trim()) parts.push(s);
    }
  }

  return { html: parts.join(""), wrappersKept };
}

/**
 * Build a Squarespace-flavored WxrItem whose body has been pre-cleaned of SQSP
 * wrapper divs, and the map options bound to the Squarespace detector. The
 * shared `mapWxrItemToPage` / `commitWxrImport` then handle everything else
 * (routing, status, tags, chunking) unchanged.
 */
export function squarespaceItemAndOptions(item: WxrItem): { item: WxrItem; issues: Array<{ kind: string; detail: string }> } {
  const { html, wrappersKept } = precleanSquarespaceHtml(item.contentHtml);
  const issues: Array<{ kind: string; detail: string }> = [];
  if (wrappersKept > 0) {
    issues.push({ kind: "sqsp-wrapper-kept", detail: `${wrappersKept} Squarespace block wrapper(s) in "${item.title}" could not be unwrapped; kept as rich text` });
  }
  return { item: { ...item, contentHtml: html }, issues };
}

/** The Squarespace card-detect, packaged as shared-mapper options. */
export const squarespaceMapOptions: WxrMapOptions = { detectCard: detectSquarespaceCard };
