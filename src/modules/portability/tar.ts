/**
 * Minimal dependency-free USTAR tar writer. No zip/tar library is installed
 * (checked package.json) and the build brief asks for a real archive without
 * adding a heavy dep — Node's built-in zlib gzips the tar stream, so the
 * final artifact is a normal, tool-openable .tar.gz.
 *
 * Only what export/import need: plain files, one directory depth, ASCII-safe
 * paths under 100 bytes (every path this module writes — manifest.json,
 * content.json, uploads/<cuid2>.<ext> — fits comfortably).
 */

const BLOCK_SIZE = 512;

export type TarEntry = { path: string; data: Uint8Array; mode?: number };

function pad(str: string, len: number): Uint8Array {
  const out = new Uint8Array(len);
  const bytes = new TextEncoder().encode(str);
  out.set(bytes.subarray(0, len));
  return out;
}

function octal(num: number, len: number): Uint8Array {
  // USTAR numeric fields are zero-padded octal strings, NUL-terminated.
  const str = num.toString(8).padStart(len - 1, "0");
  return pad(str + "\0", len);
}

function checksum(header: Uint8Array): number {
  let sum = 0;
  for (const byte of header) sum += byte;
  return sum;
}

function buildHeader(entry: TarEntry): Uint8Array {
  if (new TextEncoder().encode(entry.path).length > 100) {
    throw new Error(`tar: path too long for USTAR name field: ${entry.path}`);
  }
  const header = new Uint8Array(BLOCK_SIZE);
  header.set(pad(entry.path, 100), 0); // name
  header.set(octal(entry.mode ?? 0o644, 8), 100); // mode
  header.set(octal(0, 8), 108); // uid
  header.set(octal(0, 8), 116); // gid
  header.set(octal(entry.data.byteLength, 12), 124); // size
  header.set(octal(Math.floor(Date.now() / 1000), 12), 136); // mtime
  header.set(pad(" ".repeat(8), 8), 148); // checksum placeholder (spaces)
  header[156] = "0".charCodeAt(0); // typeflag: regular file
  header.set(pad("ustar", 6), 257); // magic
  header.set(pad("00", 2), 263); // version

  const sum = checksum(header);
  header.set(octal(sum, 8), 148);
  return header;
}

/** Rounds a byte length up to the next 512-byte boundary. */
function paddedLength(len: number): number {
  return Math.ceil(len / BLOCK_SIZE) * BLOCK_SIZE;
}

/** Serializes entries into a raw (uncompressed) USTAR tar buffer. */
export function buildTar(entries: TarEntry[]): Uint8Array {
  let total = 0;
  for (const e of entries) total += BLOCK_SIZE + paddedLength(e.data.byteLength);
  total += BLOCK_SIZE * 2; // two all-zero end-of-archive blocks

  const out = new Uint8Array(total);
  let offset = 0;
  for (const entry of entries) {
    out.set(buildHeader(entry), offset);
    offset += BLOCK_SIZE;
    out.set(entry.data, offset);
    offset += paddedLength(entry.data.byteLength);
  }
  // Remaining bytes are already zero-initialized — the required end-of-archive marker.
  return out;
}
