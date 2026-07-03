import { MIME_TO_EXT as MEDIA_MIME_TO_EXT } from "@/modules/media/validation";

/**
 * Public forms-upload allowlist. Anonymous visitors can hit this endpoint
 * (unlike media uploads, which are admin-gated), so it's a separate, smaller
 * surface: images (reusing the media module's MIME→ext map) plus PDF. SVG is
 * intentionally absent (scriptable, an XSS vector).
 */
export const FORM_UPLOAD_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": MEDIA_MIME_TO_EXT["image/jpeg"],
  "image/png": MEDIA_MIME_TO_EXT["image/png"],
  "image/webp": MEDIA_MIME_TO_EXT["image/webp"],
  "image/gif": MEDIA_MIME_TO_EXT["image/gif"],
  "application/pdf": "pdf",
};

export const FORM_UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** `accept` attribute value for the public file-upload field. */
export const FORM_UPLOAD_ACCEPT = Object.keys(FORM_UPLOAD_MIME_TO_EXT).join(",");

/**
 * Storage-key namespace for every file a form visitor uploads: a `forms`
 * prefix glued directly onto the cuid2 (no separator — the shared
 * LocalStorageAdapter's key grammar is a single flat `[a-z0-9]+\.[ext]`
 * segment with no `/` or `-`, and that adapter is not ours to widen here).
 * The prefix exists purely so submission-schema.ts can tell "a key WE
 * issued" apart from an arbitrary client-supplied string.
 */
export const FORM_UPLOAD_PREFIX = "forms";

/**
 * Shape of a storage key WE issued for a form upload:
 * `forms${cuid2}.${ext}`. Used by submission-schema.ts to reject any string
 * the client didn't get from a successful upload response.
 */
export const FORM_UPLOAD_KEY_RE = /^forms[a-z0-9]+\.(jpg|png|webp|gif|pdf)$/;
