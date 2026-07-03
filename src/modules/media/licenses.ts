/**
 * License catalog + compliance flags. Kept zod-free so client components
 * (cards, sidesheet, picker) can import labels and helpers without pulling
 * the validation layer into the bundle. validation.ts re-exports these for
 * server-side ergonomics.
 */

export const LICENSE_IDS = [
  "original",
  "client",
  "purchased",
  "cc0",
  "unsplash",
  "pexels",
  "cc-by",
  "cc-by-sa",
  "unknown",
] as const;

export type LicenseId = (typeof LICENSE_IDS)[number];

/** Labels from the design; creditRequired drives the "needs credit" flag. */
export const LICENSES: Record<LicenseId, { label: string; creditRequired: boolean }> = {
  original: { label: "Original — my own work", creditRequired: false },
  client: { label: "Client-provided", creditRequired: false },
  purchased: { label: "Purchased / licensed", creditRequired: false },
  cc0: { label: "CC0 / Public domain", creditRequired: false },
  unsplash: { label: "Unsplash", creditRequired: true },
  pexels: { label: "Pexels", creditRequired: true },
  "cc-by": { label: "CC BY", creditRequired: true },
  "cc-by-sa": { label: "CC BY-SA", creditRequired: true },
  unknown: { label: "Unknown — needs review", creditRequired: true },
};

/** Unknown license ids fail toward requiring credit (fail closed). */
export const requiresCredit = (license: string): boolean =>
  LICENSES[license as LicenseId]?.creditRequired ?? true;

/** A row needs a credit when its license requires one and none is set. */
export const needsCredit = (row: { license: string; credit: string }): boolean =>
  requiresCredit(row.license) && row.credit.trim() === "";

/** Images without alt text fail the accessibility flag. */
export const needsAlt = (row: { kind: string; alt: string }): boolean =>
  row.kind === "image" && row.alt.trim() === "";
