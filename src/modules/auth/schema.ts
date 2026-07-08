import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Admin accounts. Readers ("people") are a separate table + session kind.
 * `roleId` is the source of truth for permissions (FK → roles); `role` enum
 * is kept as a denormalized "system class" cache for backward compat with
 * the ~140 `requireUser("owner")` call sites. `personId` optionally links
 * a staff account to a CRM profile for activity-timeline continuity.
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["owner", "editor"] })
    .notNull()
    .default("editor"),
  status: text("status", { enum: ["active", "invited", "disabled"] })
    .notNull()
    .default("active"),
  roleId: text("role_id"),
  personId: text("person_id"),
  invitedAt: integer("invited_at"),
  mfaEnforcedAt: integer("mfa_enforced_at"),
  avatarMediaId: text("avatar_media_id"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Sessions for BOTH principal types. `id` stores the SHA-256 hash of the
 * opaque cookie token — a DB leak alone can't forge a session.
 */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["admin", "person"] }).notNull(),
  userId: text("user_id"),
  personId: text("person_id"),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  ip: text("ip"),
  userAgent: text("user_agent"),
  label: text("label"),
});

/** DB-backed login rate limiting (works on serverless). */
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(0),
});
