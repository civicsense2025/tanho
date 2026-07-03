import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { openJson, sealJson } from "@/lib/crypto/secretbox";
import { dataSourceOAuthConnections } from "./oauth-schema";

/**
 * Server-only data access for OAuth-connected Supabase accounts. Credentials
 * are sealed (AES-GCM) on write and opened on read HERE, so the rest of the
 * app handles plaintext tokens only transiently in server memory and the
 * client never sees them. Mirrors modules/integrations/queries.ts's
 * getCredentials/saveConnection/updateCredentials shape, adapted to
 * id-as-primary-key (see oauth-schema.ts for why).
 */

/** Shape of the sealed credential blob for a Supabase OAuth connection. */
const oauthConnectionCredentialsSchema = z.object({
  refreshToken: z.string().min(1),
  /** Cached access token + its expiry (ms); refreshed on demand. */
  accessToken: z.string().optional(),
  accessTokenExpiresAt: z.number().int().optional(),
  scope: z.string().default(""),
});
export type OAuthConnectionCredentials = z.infer<typeof oauthConnectionCredentialsSchema>;

/**
 * Decrypt and return the credentials for an OAuth connection, or null if
 * absent/invalid. SERVER-ONLY — the returned secret must never be
 * serialized to the client.
 */
export async function getOAuthCredentials(id: string): Promise<OAuthConnectionCredentials | null> {
  const row = await db.query.dataSourceOAuthConnections.findFirst({
    where: eq(dataSourceOAuthConnections.id, id),
  });
  if (!row) return null;
  const opened = openJson<unknown>(row.credentialsEncrypted);
  if (opened === null) return null;
  const parsed = oauthConnectionCredentialsSchema.safeParse(opened);
  return parsed.success ? parsed.data : null;
}

/** Insert a new OAuth connection row, sealing credentials at the boundary. Returns the new id. */
export async function saveOAuthConnection(input: {
  credentials: OAuthConnectionCredentials;
  accountLabel?: string;
  scopes?: string;
  expiresAt?: number | null;
}): Promise<string> {
  const [row] = await db
    .insert(dataSourceOAuthConnections)
    .values({
      provider: "supabase",
      credentialsEncrypted: sealJson(input.credentials),
      accountLabel: input.accountLabel ?? "",
      scopes: input.scopes ?? "",
      expiresAt: input.expiresAt ?? null,
    })
    .returning({ id: dataSourceOAuthConnections.id });
  return row!.id;
}

/**
 * Update just the cached credential blob (e.g. after an access-token
 * refresh) without touching display fields. No-op if the connection is gone.
 */
export async function updateOAuthCredentials(
  id: string,
  credentials: OAuthConnectionCredentials,
  expiresAt?: number | null,
): Promise<void> {
  await db
    .update(dataSourceOAuthConnections)
    .set({
      credentialsEncrypted: sealJson(credentials),
      expiresAt: expiresAt ?? null,
    })
    .where(eq(dataSourceOAuthConnections.id, id));
}
