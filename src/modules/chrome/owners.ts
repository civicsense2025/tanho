/**
 * Chrome block-set owners. Header and footer trees live in `block_sets` under
 * these NEW ownerTypes — the exact draft/published machinery pages use, keyed
 * `(ownerType, ownerId, variant)`. There is exactly one header and one footer
 * per site, so the ownerId is a fixed singleton id.
 */
export const CHROME_OWNER_TYPES = ["chrome:header", "chrome:footer"] as const;
export type ChromeOwnerType = (typeof CHROME_OWNER_TYPES)[number];

/** Singleton owner id (one header / one footer per site). */
export const CHROME_OWNER_ID = "site";

export const isChromeOwnerType = (t: string): t is ChromeOwnerType =>
  (CHROME_OWNER_TYPES as readonly string[]).includes(t);

/** Human labels for the admin editor + nav. */
export const CHROME_OWNER_LABEL: Record<ChromeOwnerType, string> = {
  "chrome:header": "Header",
  "chrome:footer": "Footer",
};

/** The cache tag a chrome owner's published tree is stored under (mirrors the
 *  `page:<id>` tag pattern). Read by the public layout, busted on publish. */
export const chromeTag = (ownerType: ChromeOwnerType): string => `chrome:${ownerType}`;
