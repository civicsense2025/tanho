/**
 * Google Fonts — curated allowlist + self-host fetch.
 *
 * "Lamina" means we don't leave a third-party runtime dependency in a
 * customer's pages: instead of linking `fonts.googleapis.com` at render time,
 * when an owner adds a Google font we fetch its woff2 files ONCE, server-side,
 * store them as regular media (kind "font"), and serve them from the site's
 * own origin. This is faster (no extra DNS/connection), GDPR-clean (no visitor
 * IP leak to Google), and keeps working if Google is unreachable later.
 *
 * The list below is a curated subset shipped as static data so the picker
 * needs no network call to browse. `family` is validated against this list
 * before any fetch — the family name is never taken as free-form input into a
 * URL.
 */

export type GoogleFontDef = {
  family: string;
  /** Weights offered in the picker. */
  weights: number[];
  /** Whether italic variants exist. */
  italic: boolean;
  category: "sans-serif" | "serif" | "display" | "monospace" | "handwriting";
};

/** Curated popular families. Extend freely; each must exist on Google Fonts. */
export const GOOGLE_FONTS: GoogleFontDef[] = [
  { family: "Inter", weights: [400, 500, 600, 700], italic: true, category: "sans-serif" },
  { family: "Roboto", weights: [400, 500, 700], italic: true, category: "sans-serif" },
  { family: "Open Sans", weights: [400, 600, 700], italic: true, category: "sans-serif" },
  { family: "Lato", weights: [400, 700], italic: true, category: "sans-serif" },
  { family: "Montserrat", weights: [400, 500, 600, 700], italic: true, category: "sans-serif" },
  { family: "Poppins", weights: [400, 500, 600, 700], italic: true, category: "sans-serif" },
  { family: "Work Sans", weights: [400, 500, 600, 700], italic: true, category: "sans-serif" },
  { family: "Nunito", weights: [400, 600, 700], italic: true, category: "sans-serif" },
  { family: "Source Sans 3", weights: [400, 600, 700], italic: true, category: "sans-serif" },
  { family: "Playfair Display", weights: [400, 500, 600, 700], italic: true, category: "serif" },
  { family: "Merriweather", weights: [400, 700], italic: true, category: "serif" },
  { family: "Lora", weights: [400, 500, 600, 700], italic: true, category: "serif" },
  { family: "Roboto Slab", weights: [400, 500, 700], italic: false, category: "serif" },
  { family: "Space Grotesk", weights: [400, 500, 600, 700], italic: false, category: "sans-serif" },
  { family: "DM Sans", weights: [400, 500, 700], italic: true, category: "sans-serif" },
  { family: "IBM Plex Sans", weights: [400, 500, 600, 700], italic: true, category: "sans-serif" },
  { family: "JetBrains Mono", weights: [400, 500, 700], italic: true, category: "monospace" },
  { family: "Space Mono", weights: [400, 700], italic: true, category: "monospace" },
];

const byFamily = new Map(GOOGLE_FONTS.map((f) => [f.family, f]));

export function isKnownGoogleFamily(family: string): boolean {
  return byFamily.has(family);
}

export function googleFontDef(family: string): GoogleFontDef | undefined {
  return byFamily.get(family);
}

export type FetchedFace = {
  weight: number;
  style: "normal" | "italic";
  /** The downloaded woff2 bytes. */
  bytes: Uint8Array;
};

// A modern browser UA so Google's CSS API returns woff2 `src` URLs.
const WOFF2_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Only google-hosted font files are downloadable here. */
const GSTATIC_RE = /^https:\/\/fonts\.gstatic\.com\/[^\s)"']+\.woff2$/;

/**
 * Build the Google Fonts CSS2 URL for the requested variants. Family is
 * already validated against the allowlist by the caller.
 */
function css2Url(def: GoogleFontDef, variants: { weight: number; style: "normal" | "italic" }[]): string {
  // CSS2 axis-tuple syntax: ital,wght@0,400;0,700;1,400 (sorted, ital first).
  const tuples = variants
    .map((v) => ({ ital: v.style === "italic" ? 1 : 0, wght: v.weight }))
    .sort((a, b) => a.ital - b.ital || a.wght - b.wght)
    .map((t) => `${t.ital},${t.wght}`);
  const fam = encodeURIComponent(def.family).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${tuples.join(";")}&display=swap`;
}

/**
 * Fetch the requested variants of a Google font and return their woff2 bytes.
 * Parses the CSS response's `@font-face` blocks, matching each `src` url() to
 * its weight/style via the surrounding `font-weight`/`font-style`. Downloads
 * only https://fonts.gstatic.com/*.woff2 URLs.
 */
export async function fetchGoogleFontFaces(
  family: string,
  variants: { weight: number; style: "normal" | "italic" }[],
): Promise<FetchedFace[]> {
  const def = byFamily.get(family);
  if (!def) throw new Error("Unknown Google font family");

  const res = await fetch(css2Url(def, variants), { headers: { "User-Agent": WOFF2_UA } });
  if (!res.ok) throw new Error(`Google Fonts CSS request failed (${res.status})`);
  const css = await res.text();

  const faces: FetchedFace[] = [];
  // Each @font-face block carries one src url + its weight/style. Google can
  // express weight as a single value ("400") or a range ("400 700"); match a
  // requested weight against either.
  for (const block of css.split("@font-face").slice(1)) {
    const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    if (!urlMatch || !GSTATIC_RE.test(urlMatch[1])) continue;
    const wm = block.match(/font-weight:\s*(\d+)(?:\s+(\d+))?/);
    const wLo = Number(wm?.[1] ?? "400");
    const wHi = wm?.[2] ? Number(wm[2]) : wLo;
    const style: "normal" | "italic" = /font-style:\s*italic/.test(block) ? "italic" : "normal";
    // Keep each requested variant whose weight this block covers + style matches.
    const wanted = variants.filter((v) => v.style === style && v.weight >= wLo && v.weight <= wHi);
    if (wanted.length === 0) continue;

    const fontRes = await fetch(urlMatch[1], { headers: { "User-Agent": WOFF2_UA }, redirect: "error" });
    if (!fontRes.ok) continue;
    const bytes = new Uint8Array(await fontRes.arrayBuffer());
    // A range block satisfies each requested weight it covers (a variable file
    // renders every weight in its range).
    for (const v of wanted) faces.push({ weight: v.weight, style, bytes });
  }

  // Dedup by weight+style (a requested weight can be covered by >1 block).
  const seen = new Set<string>();
  const deduped = faces.filter((f) => {
    const k = `${f.weight}:${f.style}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (deduped.length === 0) throw new Error("No downloadable woff2 faces returned");
  return deduped;
}
