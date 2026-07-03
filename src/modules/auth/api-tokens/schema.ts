import { randomUUID } from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Personal access tokens for external clients (e.g. the OYS Swift app). The
 * `tokenHash` stores only the SHA-256 of the raw bearer token — a DB leak
 * alone can't forge a token, mirroring the session model in session.ts.
 * `prefix` is the first 8 chars of the raw token, shown in the admin UI so an
 * owner can identify a token without seeing the full secret.
 *
 * Authorization reuses the user's existing role (owner/editor) — the token
 * authenticates WHO you are; `requireApiUser(role?)` enforces WHAT you can do,
 * exactly like the cookie-based `requireUser(role?)`.
 *
 * Note: `id` defaults to `randomUUID()` (not cuid2) so this schema file stays
 * free of external imports — drizzle-kit's TS path resolver mishandles bare
 * specifiers from nested subdirectories. The ID format is not load-bearing.
 */
export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  lastUsedAt: integer("last_used_at"),
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
