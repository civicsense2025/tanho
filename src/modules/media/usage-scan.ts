/**
 * Pure block-tree scanner for media references — no db access, so it is
 * unit-testable and reusable. usage.ts wraps it with the persistence step.
 */

/** Site-relative URLs minted by the storage adapter (`/api/media/<key>`). */
export const MEDIA_URL_RE = /^\/api\/media\/([a-z0-9]+\.[a-z0-9]{2,5})$/i;

export type MediaRef = { storageKey: string; whereLabel: string };

/**
 * Walks any block tree (children under `content.blocks`) and collects
 * media storage keys from the content fields that hold media URLs:
 * `src`, `poster`, and `src` inside `images[]` / `slides[]` items.
 * Deduped on (storageKey, block type) — whereLabel is the block type.
 */
export function scanBlocksForMedia(blocks: unknown[]): MediaRef[] {
  const seen = new Set<string>();
  const out: MediaRef[] = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const type = (node as { type?: unknown }).type;
    const whereLabel = typeof type === "string" && type ? type : "block";
    const content = (node as { content?: unknown }).content;
    if (!content || typeof content !== "object") return;
    const c = content as Record<string, unknown>;

    const collect = (value: unknown): void => {
      if (typeof value !== "string") return;
      const match = MEDIA_URL_RE.exec(value);
      if (!match) return;
      const dedupe = `${match[1]}|${whereLabel}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      out.push({ storageKey: match[1], whereLabel });
    };

    collect(c.src);
    collect(c.poster);
    for (const listKey of ["images", "slides"] as const) {
      const list = c[listKey];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (item && typeof item === "object") {
          collect((item as Record<string, unknown>).src);
        }
      }
    }

    if (Array.isArray(c.blocks)) for (const kid of c.blocks) visit(kid);
  };

  for (const block of blocks) visit(block);
  return out;
}
