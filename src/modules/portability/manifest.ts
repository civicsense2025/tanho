/**
 * Whole-site EXPORT/IMPORT bundle format. A bundle is a tar.gz archive:
 *
 *   manifest.json        — this Manifest, at the archive root
 *   content.json         — { manifest, tables: { [table]: row[] } }
 *   uploads/<storageKey>  — one file per row in the `media` table
 *
 * Table selection is an ALLOWLIST, never `SELECT *`: new tables added to the
 * schema are excluded by default until someone deliberately opts them in
 * here. This is the security boundary between "site content" and
 * "operational/financial/secret data" — see EXCLUDED_TABLES below for why
 * each table is left out.
 */

/** Format tag + bump this when the bundle shape changes incompatibly. */
export const BUNDLE_FORMAT = "oys-site@1" as const;

/**
 * Content tables, in FK-safe write order (parents before children). Mirrors
 * seed/sample/lib/apply.ts: settings/theme first, then pages+blockSets,
 * entries, commerce (collections→products→variants→productCollections),
 * menus, forms, policies, redirects, profile, customTypes, tags→taggings,
 * media, then people + its children last.
 */
export const CORE_TABLES = [
  "settings",
  "theme",
  "themePresets",
  "pages",
  "blockSets",
  "entries",
  "collections",
  "products",
  "productVariants",
  "productCollections",
  "menus",
  "forms",
  "policies",
  "redirects",
  "profile",
  "customTypes",
  "tags",
  "taggings",
  "media",
  "shippingZones",
] as const;

/**
 * People tables — only exported when the caller opts in (?people=1), since
 * they carry PII (emails, names, activity). Written last so `personId`
 * foreign keys in personActivity/memberships/emailSubscriptions resolve.
 */
export const PEOPLE_TABLES = ["people", "personActivity", "memberships", "emailSubscriptions"] as const;

/**
 * Tables deliberately never exported, and why:
 *  - orders, orderItems, disputes, stripeEvents: financial/webhook ledger,
 *    not "site content"; re-importing paid orders elsewhere is meaningless
 *    and risks double-counting revenue.
 *  - sessions, loginAttempts: live auth state, would let an import hijack
 *    sessions or reset rate-limit windows.
 *  - auditLog: forensic trail; importing it would let history be forged.
 *  - analyticsEvents: high-volume telemetry, not configuration or content.
 *  - integrationConnections: EXCLUDED entirely — holds AES-GCM sealed OAuth/
 *    API-key blobs. Even encrypted, shipping them in a portable bundle is a
 *    secret-sharing footgun; every deployment must connect its own accounts.
 *  - mediaUsage: derived/rebuildable from published block trees (see
 *    modules/media/usage.ts), not source data.
 *  - users: admin accounts stay deployment-local; importing them would let
 *    a bundle grant admin access on a foreign site.
 */
export const EXCLUDED_TABLES = [
  "orders",
  "orderItems",
  "disputes",
  "stripeEvents",
  "sessions",
  "loginAttempts",
  "auditLog",
  "analyticsEvents",
  "integrationConnections",
  "mediaUsage",
  "users",
] as const;

export type CoreTableName = (typeof CORE_TABLES)[number];
export type PeopleTableName = (typeof PEOPLE_TABLES)[number];
export type TableName = CoreTableName | PeopleTableName;

/** Column-name pattern stripped from every exported row: any Stripe id/ref. */
export const STRIPE_FIELD_RE = /^stripe/i;

export type Manifest = {
  format: typeof BUNDLE_FORMAT;
  /** Bundle schema version — bump alongside BUNDLE_FORMAT on breaking changes. */
  version: 1;
  /** Caller-supplied timestamp (ms). Date.now() is unavailable in some
   *  contexts (e.g. prerendering), so this is always passed in. */
  generatedAt: number;
  /** Row count per exported table, for a quick sanity check before import. */
  counts: Record<string, number>;
  includesPeople: boolean;
};

export type SiteContent = {
  manifest: Manifest;
  tables: Record<string, unknown[]>;
};

export type ExportedFile = { key: string; bytes: Uint8Array };
