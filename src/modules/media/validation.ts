import { z } from "zod";
import { LICENSE_IDS } from "./licenses";

export * from "./licenses";

/**
 * Upload allowlist: MIME → canonical extension. Closed set — the stored
 * extension always comes from this map, never from the user's filename.
 * SVG is intentionally absent (scriptable, an XSS vector; see SECURITY.md).
 */
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

/** `accept` attribute value for upload inputs — mirrors the allowlist. */
export const UPLOAD_ACCEPT = Object.keys(MIME_TO_EXT).join(",");

/** Metadata fields an admin can edit after upload. All optional (patch). */
export const mediaPatchSchema = z
  .object({
    alt: z.string().max(300),
    tags: z.array(z.string().min(1).max(40)).max(12),
    credit: z.string().max(120),
    source: z.string().max(120),
    sourceUrl: z
      .string()
      .max(400)
      .regex(/^$|^https:\/\/\S+$/, "Must be an https:// URL or empty"),
    license: z.enum(LICENSE_IDS),
  })
  .partial();

export type MediaPatch = z.infer<typeof mediaPatchSchema>;

/**
 * Display-only original filename: keep the basename, drop control
 * characters, cap at 200 chars. Never used for storage paths.
 */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "";
  const clean = Array.from(base)
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 32 && c !== 127;
    })
    .join("")
    .trim();
  return (clean || "upload").slice(0, 200);
}
