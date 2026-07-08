import { Unzip, UnzipInflate, UnzipPassThrough } from "fflate";
import type { Result } from "./types";

/**
 * Bomb-guarded ZIP extraction for the Substack/Medium/Markdown importers, following
 * the proven guards in modules/fonts/actions.ts:importFontZip — cap the compressed
 * upload size BEFORE unzip, cap the entry count, and cap each entry's decompressed
 * size. Unlike `unzipSync` (which eagerly decompresses EVERY entry into memory before
 * any check can run), this uses fflate's streaming `Unzip` decoder: each entry's
 * uncompressed size is read from its local file header and checked BEFORE any
 * decompression happens, so a zip-bomb entry is rejected/skipped without ever
 * inflating it. A cumulative decompressed-byte cap guards against many small entries
 * and against archives whose headers omit the uncompressed size (streamed zips), where
 * the per-entry guard only trips mid-decompression — input is fed in bounded chunks so
 * a single inflate call can never materialize the whole payload.
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
  /** Max total decompressed bytes across all entries (default 500MB). */
  maxTotalDecompressedBytes?: number;
  /** Keep only entries whose path matches (default: keep all non-directory entries). */
  filter?: (path: string) => boolean;
};

export type ZipEntry = { path: string; text: string; bytes: Uint8Array };

const DEFAULTS = {
  maxBytes: 50 * 1024 * 1024,
  maxEntries: 5000,
  maxEntryBytes: 20 * 1024 * 1024,
  maxTotalDecompressedBytes: 500 * 1024 * 1024,
};

/** Concatenate an array of Uint8Array chunks into one contiguous Uint8Array. */
function concatChunks(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0]!;
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Extract a ZIP File into decoded entries, or an error Result on a bomb/garbage. */
export async function extractZip(
  file: File,
  opts: ZipExtractOptions = {},
): Promise<Result<{ entries: ZipEntry[]; skipped: string[] }>> {
  const maxBytes = opts.maxBytes ?? DEFAULTS.maxBytes;
  const maxEntries = opts.maxEntries ?? DEFAULTS.maxEntries;
  const maxEntryBytes = opts.maxEntryBytes ?? DEFAULTS.maxEntryBytes;
  const maxTotalDecompressedBytes = opts.maxTotalDecompressedBytes ?? DEFAULTS.maxTotalDecompressedBytes;

  if (file.size > maxBytes) {
    return { ok: false, error: `Zip is larger than ${Math.round(maxBytes / 1024 / 1024)}MB` };
  }

  const buf = new Uint8Array(await file.arrayBuffer());

  // Reject non-zip files early. fflate's streaming Unzip silently produces no
  // entries for garbage input (unlike unzipSync, which throws), so without this
  // check a 4-byte non-zip would return `{ok: true, entries: []}` and callers
  // would treat it as a valid empty archive. A real zip starts with one of:
  // PK\x03\x04 (local file header), PK\x05\x06 (empty archive EOCD), or
  // PK\x07\x08 (spanned archive). Empty files are also rejected here.
  if (buf.length < 4 || !(buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07))) {
    return { ok: false, error: "Could not read the zip file" };
  }

  return new Promise<Result<{ entries: ZipEntry[]; skipped: string[] }>>((resolve) => {
    const entries: ZipEntry[] = [];
    const skipped: string[] = [];
    const decoder = new TextDecoder("utf-8");
    let totalDecompressed = 0;
    let entryCount = 0;
    let settled = false;

    const settle = (r: Result<{ entries: ZipEntry[]; skipped: string[] }>) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    unzip.register(UnzipPassThrough);

    unzip.onfile = (f) => {
      if (settled) return;
      if (f.name.endsWith("/")) return;
      if (opts.filter && !opts.filter(f.name)) return;

      entryCount++;
      if (entryCount > maxEntries) {
        settle({ ok: false, error: `Zip has too many files (${entryCount}); the limit is ${maxEntries}.` });
        return;
      }

      // Fast path: the local file header carries the uncompressed size, so reject or
      // skip a bomb entry WITHOUT inflating it. Not calling `start()` leaves the
      // compressed payload buffered (small) and never decompressed.
      if (f.originalSize != null) {
        if (f.originalSize > maxEntryBytes) {
          skipped.push(f.name);
          return;
        }
        if (totalDecompressed + f.originalSize > maxTotalDecompressedBytes) {
          settle({
            ok: false,
            error: `Zip would decompress to more than ${Math.round(maxTotalDecompressedBytes / 1024 / 1024)}MB`,
          });
          return;
        }
      }

      // Slow path / defense-in-depth: track actual decompressed bytes too, so a
      // streamed zip (no upfront size) or a lying header still can't blow up memory.
      const chunks: Uint8Array[] = [];
      let fileBytes = 0;
      f.ondata = (err, data, final) => {
        if (settled) return;
        if (err) {
          settle({ ok: false, error: "Could not read the zip file" });
          return;
        }
        if (data.length) {
          chunks.push(data);
          fileBytes += data.length;
          totalDecompressed += data.length;
        }
        if (fileBytes > maxEntryBytes) {
          settle({
            ok: false,
            error: `Zip entry "${f.name}" is larger than ${Math.round(maxEntryBytes / 1024 / 1024)}MB`,
          });
          return;
        }
        if (totalDecompressed > maxTotalDecompressedBytes) {
          settle({
            ok: false,
            error: `Zip would decompress to more than ${Math.round(maxTotalDecompressedBytes / 1024 / 1024)}MB`,
          });
          return;
        }
        if (final) {
          const bytes = concatChunks(chunks);
          entries.push({ path: f.name, bytes, text: decoder.decode(bytes) });
        }
      };
      f.start();
    };

    // Feed the compressed input in bounded chunks. With the sync `UnzipInflate`
    // decoder, `ondata` fires during `push`, so an oversize entry is caught and the
    // promise settled before the next chunk is fed. Chunking also bounds the output
    // of any single inflate call for streamed zips that lack an upfront uncompressed
    // size, preventing a one-shot decompression of the whole payload.
    const CHUNK = 1 << 16;
    let pos = 0;
    const feed = () => {
      if (settled) return;
      if (pos >= buf.length) {
        try {
          unzip.push(new Uint8Array(0), true);
        } catch {
          settle({ ok: false, error: "Could not read the zip file" });
          return;
        }
        if (!settled) settle({ ok: true, data: { entries, skipped } });
        return;
      }
      const end = Math.min(pos + CHUNK, buf.length);
      try {
        unzip.push(buf.subarray(pos, end), false);
      } catch {
        settle({ ok: false, error: "Could not read the zip file" });
        return;
      }
      pos = end;
      feed();
    };
    feed();
  });
}

/** Just the basename of a zip entry path ("posts/2024-01_hi.html" → "2024-01_hi.html"). */
export function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}
