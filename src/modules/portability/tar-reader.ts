import type { TarEntry } from "./tar";

const BLOCK_SIZE = 512;

function readOctal(header: Uint8Array, start: number, len: number): number {
  const raw = new TextDecoder().decode(header.subarray(start, start + len));
  const trimmed = raw.replace(/\0/g, "").trim();
  return trimmed ? parseInt(trimmed, 8) : 0;
}

function readString(header: Uint8Array, start: number, len: number): string {
  const raw = header.subarray(start, start + len);
  const nul = raw.indexOf(0);
  return new TextDecoder().decode(nul === -1 ? raw : raw.subarray(0, nul));
}

/** Parses a raw (uncompressed) USTAR tar buffer back into entries. Counterpart to tar.ts's buildTar. */
export function readTar(buf: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + BLOCK_SIZE <= buf.byteLength) {
    const header = buf.subarray(offset, offset + BLOCK_SIZE);
    // Two all-zero blocks mark end-of-archive.
    if (header.every((b) => b === 0)) break;

    const path = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] ?? 0);
    offset += BLOCK_SIZE;

    if (typeflag === "0" || typeflag === "\0") {
      const data = buf.slice(offset, offset + size);
      entries.push({ path, data });
    }
    offset += Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
  }

  return entries;
}
