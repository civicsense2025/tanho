/**
 * Permission catalog — the fixed, code-controlled set of permission keys.
 * Extensible only by editing this file + re-seeding. The catalog is the
 * source of truth for valid keys; `setRolePermissions` rejects keys not in
 * this list (CWE-20 input validation).
 *
 * `team:owner` is the sentinel that gates the ~140 existing
 * `requireUser("owner")` call sites. Only the Owner system role has it.
 */

export type PermissionKey = string;

export const PERMISSION_CATALOG = [
  { key: "team:owner", description: "Sentinel — only the Owner system role. Backward-compat for requireUser('owner')." },
  { key: "team:manage", description: "Invite/disable/remove staff, view team list" },
  { key: "team:roles:manage", description: "Create/edit/delete custom roles, assign permissions" },
  { key: "content:publish", description: "Publish entries (vs draft-only)" },
  { key: "content:delete", description: "Delete entries" },
  { key: "content:templates", description: "Edit content types / templates" },
  { key: "people:read", description: "View the CRM" },
  { key: "people:write", description: "Edit person contact fields, tags" },
  { key: "people:delete", description: "Delete people" },
  { key: "commerce:manage", description: "Products, collections, orders, shipping" },
  { key: "commerce:refund", description: "Issue refunds" },
  { key: "design:manage", description: "Theme, fonts, blocks, design packs" },
  { key: "settings:manage", description: "Site settings, integrations, domain" },
  { key: "reviews:moderate", description: "Moderate reviews" },
  { key: "media:manage", description: "Upload/delete media" },
  { key: "analytics:view", description: "View analytics" },
  { key: "import:run", description: "Run content importers" },
  { key: "billing:manage", description: "Billing / Stripe settings" },
  { key: "api:tokens:manage", description: "Create/revoke API tokens" },
  { key: "mfa:self", description: "Enroll/disable own MFA (every admin has this)" },
] as const;

export const ALL_PERMISSION_KEYS: readonly string[] = PERMISSION_CATALOG.map((p) => p.key);

/** Validates that a key is in the catalog. */
export function isValidPermissionKey(key: string): boolean {
  return ALL_PERMISSION_KEYS.includes(key);
}

/**
 * System role → permission assignments. Seeded idempotently by `seed/team.ts`.
 * System roles reject `setRolePermissions` — their permissions are seed-controlled.
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: [...ALL_PERMISSION_KEYS],
  Editor: [
    "content:publish", "content:delete", "content:templates",
    "people:read", "people:write", "people:delete",
    "commerce:manage", "commerce:refund",
    "design:manage", "reviews:moderate", "media:manage",
    "analytics:view", "import:run", "mfa:self",
  ],
  Author: ["content:publish", "media:manage", "mfa:self"],
  Moderator: ["reviews:moderate", "people:read", "people:write", "mfa:self"],
  Viewer: ["people:read", "analytics:view", "mfa:self"],
};

/** System role definitions — seeded idempotently. */
export const SYSTEM_ROLES = [
  { name: "Owner", description: "Full access to everything", isSystem: true, requireMfa: false },
  { name: "Editor", description: "Manage content, people, commerce, design — no team/billing/settings", isSystem: true, requireMfa: false },
  { name: "Author", description: "Publish content and manage media", isSystem: true, requireMfa: false },
  { name: "Moderator", description: "Moderate reviews and manage people contacts", isSystem: true, requireMfa: false },
  { name: "Viewer", description: "Read-only access to people and analytics", isSystem: true, requireMfa: false },
] as const;
