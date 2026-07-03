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
    case "application/pdf":
      return asciiAt(data, 0, "%PDF");
    case "video/mp4":
      return asciiAt(data, 4, "ftyp");
    default:
      return false;
  }
}
