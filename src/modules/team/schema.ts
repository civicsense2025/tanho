import { createId } from "@paralleldrive/cuid2";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Roles — system roles (Owner/Editor/Author/Moderator/Viewer) are seeded and
 * immutable (`isSystem = true`); owners can create custom roles. `requireMfa`
 * is a per-role override on top of the org-wide `team.mfaRequired` setting.
 */
export const roles = sqliteTable("roles", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  requireMfa: integer("require_mfa", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Permission catalog — fixed, code-controlled keys from `team/permissions.ts`.
 * Seeded idempotently; the catalog is the source of truth for valid keys.
 */
export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey().$defaultFn(createId),
  key: text("key").notNull().unique(),
  description: text("description").notNull().default(""),
});

/** Role → permission junction (composite PK). */
export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id").notNull(),
    permissionId: text("permission_id").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }),
);
