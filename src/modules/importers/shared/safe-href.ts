const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Allowlist an extracted href's scheme: keeps http(s), mailto, and schemeless
 * (relative) URLs; rejects javascript:, data:, vbscript:, file:, and any other
 * scheme. Returns null for anything unsafe or empty so callers can drop the
 * card (matching each detector's "missing fields → return null" contract).
 */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Browsers strip ASCII control chars and whitespace when resolving a URL's
  // scheme; mirror that so obfuscated schemes (e.g. "java\tscript:") can't
  // slip past the scheme check.
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!stripped) return null;
  const schemeMatch = stripped.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    const scheme = `${schemeMatch[1]!.toLowerCase()}:`;
    if (!SAFE_SCHEMES.has(scheme)) return null;
  }
  return stripped;
}
