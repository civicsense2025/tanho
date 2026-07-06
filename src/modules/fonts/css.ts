import { FAMILY_NAME_RE } from "./validation";
import type { fontFaces, fontFamilies } from "./schema";

/**
 * Builds the `@font-face` CSS for active custom families, plus a safe
 * `font-family` stack for `--font-sans`. Everything emitted here lands in a
 * server-rendered <style> tag, so — exactly like theme/css-vars.ts — every
 * dynamic value is re-validated against a strict pattern and dropped if it
 * fails. Owner-controlled strings (family names) are never interpolated raw.
 */

type FaceRow = typeof fontFaces.$inferSelect;
type FamilyRow = typeof fontFamilies.$inferSelect;

/** A media publicUrl resolver (injected so this stays pure/testable). */
export type UrlFor = (mediaId: string) => string | null;

/** Emit-time family-name guard: the shared char-class (validation.ts) plus a
 *  length bound (the DB column is unbounded, so re-check both before emitting
 *  into a <style> tag). */
const isSafeFamilyName = (name: string): boolean =>
  name.length >= 1 && name.length <= 60 && FAMILY_NAME_RE.test(name);
/** unicode-range: e.g. "U+000-5FF, U+1E00-1EFF". */
const UNICODE_RANGE_RE = /^[uU+0-9a-fA-F,\s-]{1,300}$/;
/** Only our own same-origin media URLs may appear in src: url(). */
const MEDIA_URL_RE = /^\/api\/media\/[a-z0-9]+\.(woff2|woff|ttf|otf)$/i;

const EXT_FORMAT: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

/** A neutral fallback stack appended after the custom family. */
const FALLBACK_STACK = "ui-sans-serif, system-ui, -apple-system, sans-serif";

/**
 * The value for `--font-sans` given a family name. Returns null (caller falls
 * back to the preset stack) if the name isn't safe.
 */
export function cssStackFor(familyName: string): string | null {
  if (!isSafeFamilyName(familyName)) return null;
  return `"${familyName}", ${FALLBACK_STACK}`;
}

/** `font-display` for custom faces — `swap` keeps brand text visible ASAP. */
const FONT_DISPLAY = "swap";

/**
 * Emit one `@font-face` per face. Faces whose family name, media URL, or
 * unicode-range fail validation are skipped, never emitted.
 */
export function buildFontFaceCss(
  families: FamilyRow[],
  faces: FaceRow[],
  urlFor: UrlFor,
): string {
  const nameById = new Map(families.map((f) => [f.id, f.name]));
  const out: string[] = [];

  for (const face of faces) {
    const familyName = nameById.get(face.familyId);
    if (!familyName || !isSafeFamilyName(familyName)) continue;

    const url = urlFor(face.mediaId);
    if (!url || !MEDIA_URL_RE.test(url)) continue;
    const ext = url.split(".").pop()!.toLowerCase();
    const format = EXT_FORMAT[ext];
    if (!format) continue;

    const weight =
      Number.isInteger(face.weight) && face.weight >= 1 && face.weight <= 1000
        ? face.weight
        : 400;
    const style = face.style === "italic" ? "italic" : "normal";

    const decls = [
      `font-family:"${familyName}"`,
      `src:url("${url}") format("${format}")`,
      `font-weight:${weight}`,
      `font-style:${style}`,
      `font-display:${FONT_DISPLAY}`,
    ];
    if (face.unicodeRange && UNICODE_RANGE_RE.test(face.unicodeRange)) {
      decls.push(`unicode-range:${face.unicodeRange}`);
    }
    out.push(`@font-face{${decls.join(";")}}`);
  }

  return out.join("\n");
}

/**
 * The primary face to preload (first normal/400-ish face of the active family)
 * — returns its media URL, or null. Preloading only the primary face follows
 * the "preload 1–2 critical fonts" guidance without over-preloading.
 */
export function primaryPreloadUrl(
  activeFamilyId: string | null,
  faces: FaceRow[],
  urlFor: UrlFor,
): string | null {
  if (!activeFamilyId) return null;
  const fam = faces.filter((f) => f.familyId === activeFamilyId);
  if (fam.length === 0) return null;
  const pick =
    fam.find((f) => f.style === "normal" && f.weight === 400) ??
    fam.find((f) => f.style === "normal") ??
    fam[0];
  const url = urlFor(pick.mediaId);
  return url && MEDIA_URL_RE.test(url) && /\.woff2$/i.test(url) ? url : null;
}
