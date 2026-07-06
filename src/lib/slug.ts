/**
 * The one slugify. Lowercase, ASCII-fold, collapse every run of
 * non-alphanumerics to a single hyphen, trim leading/trailing hyphens, cap
 * length. Replaces the three ad-hoc inline copies (block packs, design packs,
 * commerce collections) so slugs are consistent everywhere — including the
 * heading-anchor ids the table-of-contents block links to.
 */
export function slugify(input: string, maxLength = 80): string {
  return input
    .normalize("NFKD")
    // Strip the combining-diacritical-marks block (U+0300–U+036F) that NFKD
    // splits accents into, so "Café" → "cafe", not "caf". (The range in the
    // regex below IS those raw combining characters.)
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    // A trailing hyphen can reappear if the slice landed mid-separator.
    .replace(/-+$/g, "");
}

/**
 * Keystroke-friendly slugify for CONTROLLED INPUTS. Identical to `slugify`
 * except it does NOT strip a trailing hyphen — stripping it mid-typing makes
 * hyphenated slugs impossible to type ("summer-" would snap back to "summer"
 * the instant "-" is pressed). Callers must normalize with the strict
 * `slugify` before persisting.
 */
export function slugifyLive(input: string, maxLength = 80): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, maxLength);
}

/**
 * Slugify a list while guaranteeing every result is unique within it — a
 * repeated heading text ("Overview" twice) becomes `overview`, `overview-2`,
 * `overview-3`. Order-preserving; the first occurrence keeps the bare slug.
 * Empty/blank inputs fall back to `section` so an anchor is always addressable.
 *
 * The suffix is advanced until it lands on an UNUSED slug — a naive per-base
 * counter would emit a duplicate when its `-N` suffix collides with a natural
 * slug (e.g. `["Usage","Usage","Usage 2"]` → the counter's `usage-2` clashes
 * with slugified "Usage 2"). Two DOM elements sharing an id breaks anchor
 * links and scroll-spy, so every emitted slug is recorded and never reused.
 */
export function dedupeSlugs(inputs: string[]): string[] {
  const used = new Set<string>();
  return inputs.map((raw) => {
    const base = slugify(raw) || "section";
    let candidate = base;
    let n = 1;
    while (used.has(candidate)) candidate = `${base}-${++n}`;
    used.add(candidate);
    return candidate;
  });
}
