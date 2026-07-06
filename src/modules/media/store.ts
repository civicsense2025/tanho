import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/client";
import { storage } from "@/adapters/storage";
import { media } from "./schema";
import { matchesSignature } from "./signature";
import { sanitizeSvg } from "./svg-sanitize";
import { FONT_MIMES, MAX_UPLOAD_BYTES, MIME_TO_EXT, sanitizeFilename } from "./validation";

export type MediaRow = typeof media.$inferSelect;

export const kindOf = (mime: string): "image" | "video" | "doc" | "font" =>
  FONT_MIMES.has(mime)
    ? "font"
    : mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
        ? "video"
        : "doc";

export type StoreResult =
  | { ok: true; row: MediaRow }
  | { ok: false; error: string };

/**
 * Validate + store raw bytes as a media row, returning it (without the audit
 * write — the caller owns that, since it holds the acting user). This is the
 * shared core behind both direct uploads (media/actions.uploadMedia) and
 * derived assets like self-hosted Google fonts (fonts/actions). It runs the
 * SAME allowlist + magic-byte + SVG-sanitization checks regardless of source.
 */
export async function storeMediaBytes(
  input: Uint8Array,
  mime: string,
  displayName: string,
): Promise<StoreResult> {
  if (input.byteLength === 0) return { ok: false, error: "File is empty" };
  if (input.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "File is larger than 15MB" };

  const ext = MIME_TO_EXT[mime];
  if (!ext) return { ok: false, error: "Unsupported file type" };
  if (!matchesSignature(mime, input)) {
    return { ok: false, error: "File content does not match its type" };
  }

  let bytes = input;
  if (mime === "image/svg+xml") {
    const clean = sanitizeSvg(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
    if (!clean) return { ok: false, error: "SVG could not be safely sanitized" };
    bytes = new TextEncoder().encode(clean);
  }

  const key = `${createId()}.${ext}`;
  await storage.put(key, bytes, mime);
  const [row] = await db
    .insert(media)
    .values({
      storageKey: key,
      name: sanitizeFilename(displayName),
      kind: kindOf(mime),
      mime,
      size: bytes.byteLength,
    })
    .returning();
  return { ok: true, row };
}
