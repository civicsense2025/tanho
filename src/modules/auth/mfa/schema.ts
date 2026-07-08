import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * TOTP MFA secret for a user (1:1 with `users`). The `secret` column stores
 * AES-256-GCM encrypted base32 (format: `iv:ciphertext:authTag`, all base64) —
 * a DB leak alone can't mint valid TOTP codes. See `totp.ts` for encrypt/
 * decrypt. `enabledAt` marks when the user confirmed enrollment by verifying
 * a TOTP code; until then the row exists but MFA is not enforced.
 */
export const userMfa = sqliteTable("user_mfa", {
  userId: text("user_id").primaryKey(),
  secret: text("secret").notNull(),
  enabledAt: integer("enabled_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Single-use backup codes for MFA recovery. `codeHash` stores the SHA-256 of
 * the raw code — a DB leak alone can't use a backup code. `usedAt` is null
 * until consumed; a used code is rejected on replay. See `backup-codes.ts`.
 */
export const userBackupCodes = sqliteTable("user_backup_codes", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id").notNull(),
  codeHash: text("code_hash").notNull().unique(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
