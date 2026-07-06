import * as fontkit from "fontkit";

/**
 * Server-side font metadata extraction. Parses an uploaded font binary's
 * internal tables (family/subfamily name, OS/2 weight class, italic angle,
 * variation axes) so the fonts manager can pre-fill the family/weight/style
 * matching table instead of making the owner label every file by hand.
 *
 * Parsing is best-effort: a file that fontkit can't read still uploads (the
 * user can label it manually), so failures degrade rather than block.
 */

export type FontMeta = {
  familyName: string;
  /** Full label, e.g. "Inter Bold Italic". */
  fullName: string;
  weight: number; // 1–1000
  style: "normal" | "italic";
  isVariable: boolean;
  /** Variable-font axis tags (e.g. ["wght", "slnt"]) — empty for static. */
  axes: string[];
};

const clampWeight = (w: number): number =>
  Number.isFinite(w) ? Math.min(1000, Math.max(1, Math.round(w))) : 400;

const sanitizeName = (s: string): string =>
  (s || "").replace(/[^a-zA-Z0-9 -]/g, "").trim().slice(0, 60);

/** Parse metadata from font bytes, or null if unreadable. */
export function parseFontMeta(bytes: Uint8Array): FontMeta | null {
  let font: fontkit.Font | fontkit.FontCollection;
  try {
    font = fontkit.create(Buffer.from(bytes));
  } catch {
    return null;
  }
  // Font collections (.ttc) expose multiple faces; take the first.
  const face = "fonts" in font ? font.fonts[0] : font;
  if (!face) return null;

  const axes = Object.keys(face.variationAxes ?? {});
  const isVariable = axes.length > 0;

  // Weight: OS/2 usWeightClass is the reliable source; fall back to 400.
  const weightClass = face["OS/2"]?.usWeightClass;
  const weight = clampWeight(typeof weightClass === "number" ? weightClass : 400);

  // Italic: OS/2 fsSelection bit is ideal but not always typed; use the
  // italic angle + subfamily name as a robust proxy.
  const sub = (face.subfamilyName ?? "").toLowerCase();
  const style: "normal" | "italic" =
    face.italicAngle !== 0 || sub.includes("italic") || sub.includes("oblique")
      ? "italic"
      : "normal";

  const familyName = sanitizeName(face.familyName ?? "");
  if (!familyName) return null;

  return {
    familyName,
    fullName: sanitizeName(face.fullName ?? familyName),
    weight,
    style,
    isVariable,
    axes,
  };
}
