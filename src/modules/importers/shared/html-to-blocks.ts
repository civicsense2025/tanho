import { chunkHtmlAtTopLevelBoundaries, splitIntoTopLevelElements, unwrapContainers } from "../ghost/chunk-html";
import type { CardDetector, ImportedBlock, ParseIssue } from "./types";

/**
 * Target chunk size for a post/item's html, well under richtextSchema's 200,000-char
 * cap (blocks/richtext/fields.ts) — leaves headroom for the rare single element the
 * chunker keeps whole rather than corrupt (see ghost/chunk-html.ts). Splitting means
 * "accept a post of any length" without raising the shared per-block cap every page is
 * bound by. The value ghost/map.ts and wxr/map.ts both used before this extraction.
 */
export const RICHTEXT_CHUNK_TARGET = 150_000;

/**
 * THE shared HTML→blocks engine — the single copy of the loop ghost/map.ts's
 * `mapPostBody` and wxr/map.ts's `mapItemBody` used to duplicate verbatim.
 *
 * Splits html into top-level elements, maps each recognized element to its native
 * OYS block via `detectCard`, and coalesces runs of unrecognized elements back into
 * chunked richtext blocks (so 5 plain paragraphs become one richtext block, not 5).
 * Runs SEQUENTIALLY, not via Promise.all, because a detector's embed path can make a
 * real network call (oEmbed) — a post with many embeds resolves them one at a time,
 * never firing N concurrent third-party requests from one import.
 *
 * `nextId` is injected (not a module global) so the CALLER can interleave its own
 * blocks — e.g. Ghost unshifts a paywall block using the same counter — and so ids
 * stay deterministic per import. `idPrefix` is documentation only: `nextId` already
 * bakes in the prefix (see makeBlockIdFactory); it's kept on the options for clarity
 * at call sites and future use.
 */
export async function htmlToBlocks(
  html: string,
  opts: {
    detectCard: CardDetector;
    idPrefix: string;
    nextId: () => string;
    /** When true, first descend through a single generic wrapper element
     *  (`<div class="body markup">…</div>`) so nested figures/embeds become
     *  top-level and get card-detected. Off by default — set by importers whose
     *  export wraps the whole post body in a container (e.g. Substack). */
    unwrap?: boolean;
  },
): Promise<{ blocks: ImportedBlock[]; issues: ParseIssue[] }> {
  const { detectCard, nextId, unwrap = false } = opts;
  const issues: ParseIssue[] = [];
  const blocks: ImportedBlock[] = [];
  let pendingRichtext: string[] = [];

  const source = unwrap ? unwrapContainers(html) : html;

  const flushRichtext = () => {
    if (pendingRichtext.length === 0) return;
    const chunks = chunkHtmlAtTopLevelBoundaries(pendingRichtext.join(""), RICHTEXT_CHUNK_TARGET);
    for (const chunkHtml of chunks) {
      blocks.push({ id: nextId(), type: "richtext", content: { html: chunkHtml } });
    }
    pendingRichtext = [];
  };

  for (const element of splitIntoTopLevelElements(source)) {
    // Detectors read `root.firstChild` to find the element, which is the leading
    // TEXT node when the source is pretty-printed (whitespace/newlines between
    // elements) — so a card would be missed. Detect on a trimmed copy; keep the
    // original (with its surrounding whitespace) for the richtext fallback.
    const detected = await detectCard(element.trim());
    if (detected) {
      flushRichtext();
      blocks.push({ id: nextId(), type: detected.block.type, content: detected.block.content });
      issues.push(...detected.issues);
    } else {
      pendingRichtext.push(element);
    }
  }
  flushRichtext();

  return { blocks, issues };
}
