/** Pure display helpers shared by the media admin components (client-safe). */

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Mirrors the storage adapter's publicUrl for client-side rendering. */
export const mediaUrl = (storageKey: string): string => `/api/media/${storageKey}`;

/** The copyable attribution line from the design. */
export const attributionLine = (m: { credit: string; source: string }): string =>
  `Photo by ${m.credit || "—"}${m.source ? ` — ${m.source}` : ""}`;

/** Comma-separated input → clamped tag list (client mirror of the schema caps). */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().slice(0, 40);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length === 12) break;
  }
  return out;
}

export const basename = (url: string): string => url.split("/").pop() ?? url;

/** `size · WxH · usage` meta line for cards and the sidesheet. */
export function metaLine(m: {
  size: number;
  w: number | null;
  h: number | null;
  usage: unknown[];
}): string {
  const parts = [formatSize(m.size)];
  if (m.w && m.h) parts.push(`${m.w}x${m.h}`);
  parts.push(m.usage.length ? `Used in ${m.usage.length}` : "Unused");
  return parts.join(" · ");
}
