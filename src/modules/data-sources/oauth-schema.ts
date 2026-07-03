import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * OAuth-connected Supabase accounts — the "Supabase account" parent object
 * behind the OAuth-first connect flow (see the data-sources friction-
 * reduction plan, item 3). NOT a repurposing of `integrationConnections`:
 * that table is provider-as-PRIMARY-KEY, a closed set of one-account-per-
 * surface integrations, which is the wrong shape here because an owner
 * could disconnect and reconnect to a DIFFERENT Supabase org — `id` is the
 * primary key so more than one OAuth connection can exist over time (and,
 * later, concurrently).
 *
 * `credentialsEncrypted` is an AES-GCM sealed blob (sealJson, see
 * lib/crypto/secretbox.ts) holding the refresh + cached access token —
 * never stored in plaintext, never sent to the client. Non-secret display
 * fields (`accountLabel`, `scopes`, timestamps) live in the clear so the
 * admin can render a connected state without decrypting.
 *
 * One OAuth connection can list/spawn many `dataSourceConnections` project
 * rows (see the nullable `oauthConnectionId` FK added there).
 */
export const dataSourceOAuthConnections = sqliteTable("data_source_oauth_connections", {
  id: text("id").primaryKey().$defaultFn(createId),
  provider: text("provider", { enum: ["supabase"] }).notNull(),
  /** Human label for the connected account (org/user email) — non-secret. */
  accountLabel: text("account_label").notNull().default(""),
  /** AES-GCM sealed JSON credential blob (secretbox token: refresh + access token). */
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  /** Space-delimited granted scopes, for display + re-consent decisions. */
  scopes: text("scopes").notNull().default(""),
  /** Access-token expiry (ms) when known; refresh happens before this. */
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type DataSourceOAuthConnectionRow = typeof dataSourceOAuthConnections.$inferSelect;
