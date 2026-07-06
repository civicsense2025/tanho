/**
 * Magic-byte signature sniffing for the upload allowlist. The declared
 * MIME must match the file's leading bytes — a renamed .html or script
 * file is rejected even when the browser reports an allowlisted type.
 */

const bytesAt = (data: Uint8Array, offset: number, expected: number[]): boolean =>
  expected.every((b, i) => data[offset + i] === b);

const asciiAt = (data: Uint8Array, offset: number, text: string): boolean =>
  bytesAt(
    data,
    offset,
    Array.from(text, (ch) => ch.charCodeAt(0)),
  );

/**
 * True when the leading bytes look like a standalone SVG. SVG is XML and has
 * no fixed magic number, so this is a lightweight sniff — a real `<svg` (or an
 * `<?xml`/`<!--`/DOCTYPE preamble that precedes one) must appear near the
 * start. This is only a first gate; svg-sanitize.ts is the actual security
 * control (it strips scripts/handlers/foreignObject/external refs).
 */
function looksLikeSvg(data: Uint8Array): boolean {
  // Decode a bounded prefix (skip a UTF-8 BOM), lowercase, and look for "<svg".
  const start = bytesAt(data, 0, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(data.subarray(start, start + 1024))
    .trimStart()
    .toLowerCase();
  if (!head.startsWith("<")) return false;
  return head.includes("<svg");
}

/** True when `data` starts with the signature required for `mime`. */
export function matchesSignature(mime: string, data: Uint8Array): boolean {
  switch (mime) {
    case "image/jpeg":
      return bytesAt(data, 0, [0xff, 0xd8, 0xff]);
    case "image/png":
      return bytesAt(data, 0, [0x89, 0x50, 0x4e, 0x47]);
    case "image/gif":
      return asciiAt(data, 0, "GIF8");
    case "image/webp":
      return asciiAt(data, 0, "RIFF") && asciiAt(data, 8, "WEBP");
    case "image/svg+xml":
      return looksLikeSvg(data);
    case "application/pdf":
      return asciiAt(data, 0, "%PDF");
    case "video/mp4":
      return asciiAt(data, 4, "ftyp");
    // Font formats. woff2 = "wOF2", woff = "wOFF", OTF (CFF outlines) = "OTTO",
    // TTF/OpenType-TT = 0x00010000 or the "true"/"ttcf" collection tags.
    case "font/woff2":
      return asciiAt(data, 0, "wOF2");
    case "font/woff":
      return asciiAt(data, 0, "wOFF");
    case "font/otf":
      return asciiAt(data, 0, "OTTO");
    case "font/ttf":
      return (
        bytesAt(data, 0, [0x00, 0x01, 0x00, 0x00]) ||
        asciiAt(data, 0, "true") ||
        asciiAt(data, 0, "ttcf")
      );
    default:
      return false;
  }
}
