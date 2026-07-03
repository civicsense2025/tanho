import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * BYO integration connections — one row per connected external account.
 *
 * `provider` is the stable key (e.g. "google-calendar", "google-analytics",
 * "google-search-console", "ai"). `credentials` is an OPAQUE, AES-GCM sealed
 * blob (see lib/crypto/secretbox.ts) holding whatever that provider needs
 * (OAuth refresh token + scopes, or an API key) — never stored in plaintext,
 * never sent to the client. Non-secret display fields (`accountLabel`,
 * `status`, timestamps) live in the clear so the admin can render a connected
 * state without decrypting.
 *
 * This table is deployment-local: every white-labeler connects their OWN
 * accounts. The platform vendor's credentials are never involved.
 */
export const integrationConnections = sqliteTable("integration_connections", {
  provider: text("provider").primaryKey(),
  status: text("status", { enum: ["connected", "error", "revoked"] })
    .notNull()
    .default("connected"),
  /** AES-GCM sealed JSON credential blob (secretbox token). */
  credentials: text("credentials").notNull(),
  /** Human label for the connected account (email, property id) — non-secret. */
  accountLabel: text("account_label").notNull().default(""),
  /** Space-delimited granted scopes, for display + re-consent decisions. */
  scopes: text("scopes").notNull().default(""),
  /** Access-token expiry (ms) when known; refresh happens before this. */
  expiresAt: integer("expires_at"),
  connectedAt: integer("connected_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
