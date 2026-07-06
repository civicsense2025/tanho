import { z } from "zod";
import { LICENSE_IDS } from "./licenses";

export * from "./licenses";

/**
 * Upload allowlist: MIME → canonical extension. Closed set — the stored
 * extension always comes from this map, never from the user's filename.
 *
 * SVG is accepted but ONLY after server-side sanitization (svg-sanitize.ts)
 * strips scripts, event handlers, <foreignObject>, and external references
 * before it ever touches storage, and it is rendered exclusively via
 * `<img src>` (which does not execute embedded script). See SECURITY.md.
 *
 * Font formats (woff2/woff/ttf/otf) back the custom-font feature; they are
 * served as static assets and parsed server-side (fontkit) for metadata only.
 */
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
};

/** The font MIME types within the allowlist — used to route upload `kind`. */
export const FONT_MIMES = new Set(["font/woff2", "font/woff", "font/ttf", "font/otf"]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

/** `accept` attribute value for image/logo upload inputs (no fonts). */
export const UPLOAD_ACCEPT = Object.keys(MIME_TO_EXT)
  .filter((m) => !FONT_MIMES.has(m))
  .join(",");

/** `accept` attribute value for font upload inputs. */
export const FONT_UPLOAD_ACCEPT = [...FONT_MIMES, ".woff2,.woff,.ttf,.otf"].join(",");

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
