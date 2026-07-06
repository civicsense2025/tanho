import { unzipSync } from "fflate";
import type { Result } from "./types";

/**
 * Bomb-guarded ZIP extraction for the Substack/Medium/Markdown importers, following
 * the proven guards in modules/fonts/actions.ts:importFontZip — cap the compressed
 * upload size BEFORE unzip, cap the entry count, and cap each entry's decompressed
 * size. `unzipSync` decompresses eagerly, so the per-entry `byteLength` check after
 * unzip is the real bomb guard; the entry-count cap bounds memory/allocation.
 *
 * Returns text-decoded entries matching `filter` (default: all). A single oversize
 * entry is skipped (with its name reported) rather than aborting the whole import.
 */
export type ZipExtractOptions = {
  /** Max compressed upload size (default 50MB). */
  maxBytes?: number;
  /** Max number of entries after unzip (default 5000). */
  maxEntries?: number;
  /** Max decompressed bytes per entry (default 20MB). */
  maxEntryBytes?: number;
  /** Keep only entries whose path matches (default: keep all non-directory entries). */
  filter?: (path: string) => boolean;
};

export type ZipEntry = { path: string; text: string; bytes: Uint8Array };

const DEFAULTS = { maxBytes: 50 * 1024 * 1024, maxEntries: 5000, maxEntryBytes: 20 * 1024 * 1024 };

/** Extract a ZIP File into decoded entries, or an error Result on a bomb/garbage. */
export async function extractZip(
  file: File,
  opts: ZipExtractOptions = {},
): Promise<Result<{ entries: ZipEntry[]; skipped: string[] }>> {
  const maxBytes = opts.maxBytes ?? DEFAULTS.maxBytes;
  const maxEntries = opts.maxEntries ?? DEFAULTS.maxEntries;
  const maxEntryBytes = opts.maxEntryBytes ?? DEFAULTS.maxEntryBytes;

  if (file.size > maxBytes) {
    return { ok: false, error: `Zip is larger than ${Math.round(maxBytes / 1024 / 1024)}MB` };
  }

  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { ok: false, error: "Could not read the zip file" };
  }

  const paths = Object.keys(raw).filter((p) => !p.endsWith("/") && (opts.filter ? opts.filter(p) : true));
  if (paths.length > maxEntries) {
    return { ok: false, error: `Zip has too many files (${paths.length}); the limit is ${maxEntries}.` };
  }

  const entries: ZipEntry[] = [];
  const skipped: string[] = [];
  const decoder = new TextDecoder("utf-8");
  for (const path of paths) {
    const bytes = raw[path]!;
    if (bytes.byteLength > maxEntryBytes) {
      skipped.push(path);
      continue;
    }
    entries.push({ path, bytes, text: decoder.decode(bytes) });
  }
  return { ok: true, data: { entries, skipped } };
}

/** Just the basename of a zip entry path ("posts/2024-01_hi.html" → "2024-01_hi.html"). */
export function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}
