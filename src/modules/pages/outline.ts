import { isContainer, kidsOf } from "@/blocks/tree";
import { dedupeSlugs } from "@/lib/slug";
import type { BlockNode } from "@/blocks/types";

/** One entry in a page's heading outline — what the table-of-contents links to. */
export type OutlineHeading = {
  /** Anchor id (deduped, unique within the page) — matches the id RenderHeading emits. */
  id: string;
  text: string;
  /** 1–6, from the heading block's `level` (h1–h6). */
  level: number;
};

export type Outline = {
  /** Heading entries in document order — the TOC's data. */
  headings: OutlineHeading[];
  /** Page-unique anchor id per anchor-bearing block (headings AND blocks with
   *  an `anchorId`, e.g. sections) — the walker stamps these onto blocks so
   *  every id on the page comes from ONE deduped namespace. */
  byBlockId: Record<string, string>;
  /** Every block type present in the tree — lets the route decide cheaply
   *  which page-level context to fetch (e.g. ancestors only when a
   *  breadcrumbs block exists) without a second tree walk. */
  types: Set<string>;
};

const LEVEL: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

type Anchorable = {
  blockId: string;
  /** What the anchor id is derived from: heading text, or a block's anchorId. */
  source: string;
  /** Present only for heading blocks (they alone feed the TOC). */
  heading?: { text: string; level: number };
};

/** One depth-first pass: anchor-bearing blocks in document order + the type set. */
function collect(blocks: BlockNode[], out: Anchorable[], types: Set<string>): void {
  for (const b of blocks) {
    types.add(b.type);
    if (b.type === "heading") {
      const c = b.content as { text?: unknown; level?: unknown };
      const text = typeof c.text === "string" ? c.text : "";
      const level = LEVEL[typeof c.level === "string" ? c.level : "h2"] ?? 2;
      if (text.trim()) out.push({ blockId: b.id, source: text, heading: { text, level } });
    } else {
      // Any block carrying an anchorId (sections today) claims an id in the
      // SAME namespace as headings, so a section anchorId "setup" and a
      // heading "Setup" can never emit duplicate DOM ids.
      const anchorId = (b.content as { anchorId?: unknown }).anchorId;
      if (typeof anchorId === "string" && anchorId.trim()) {
        out.push({ blockId: b.id, source: anchorId });
      }
    }
    // Layout blocks hold children in content.blocks — recurse so nested
    // anchors (inside sections/containers/rows/columns) are included.
    if (isContainer(b)) collect(kidsOf(b), out, types);
  }
}

/**
 * Build a page's anchor outline from its block tree in one walk. Pure: collects
 * every anchor-bearing block (headings + blocks with an `anchorId`) in document
 * order and assigns each a page-unique id via `dedupeSlugs` (repeats get
 * `-2`/`-3` suffixes, exactly as the browser resolves duplicate ids to the
 * first match). The walker stamps these ids back onto blocks via
 * `ctx.anchors`, so rendered ids and TOC links always agree.
 *
 * Runs per request in the public page route (a cheap in-memory walk over the
 * already-loaded tree — no I/O). IMPORTANT: on gated pages, call this on
 * `visibleBlocksFor(viewer, blocks)`, never the full tree, so the TOC can't
 * leak paywalled headings or link to anchors that were never rendered.
 */
export function buildOutline(blocks: BlockNode[]): Outline {
  const raw: Anchorable[] = [];
  const types = new Set<string>();
  collect(blocks, raw, types);
  const ids = dedupeSlugs(raw.map((a) => a.source));
  const byBlockId: Record<string, string> = {};
  const headings: OutlineHeading[] = [];
  raw.forEach((a, i) => {
    byBlockId[a.blockId] = ids[i]!;
    if (a.heading) headings.push({ id: ids[i]!, text: a.heading.text, level: a.heading.level });
  });
  return { headings, byBlockId, types };
}
