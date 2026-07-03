import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { openJson, sealJson } from "@/lib/crypto/secretbox";
import { integrationConnections } from "./schema";
import {
  integrationCredentialsSchema,
  type IntegrationCredentials,
  type IntegrationProvider,
} from "./validation";

/**
 * Server-only data access for BYO integration connections. Credentials are
 * sealed (AES-GCM) on write and opened on read HERE, so the rest of the app
 * handles plaintext credentials only transiently in server memory and the
 * client never sees them. Reads are uncached: connection state changes at
 * runtime (OAuth callback, disconnect) and is only read server-side.
 */

/** Non-secret connection summary for admin display. */
export type ConnectionSummary = {
  provider: string;
  status: "connected" | "error" | "revoked";
  accountLabel: string;
  scopes: string;
  connectedAt: number;
  expiresAt: number | null;
};

/** Is this provider connected (status = connected)? Cheap, no decryption. */
export async function isConnected(provider: IntegrationProvider): Promise<boolean> {
  const row = await db.query.integrationConnections.findFirst({
    where: eq(integrationConnections.provider, provider),
  });
  return row?.status === "connected";
}

/** Non-secret summary for the admin connect UI, or null when absent. */
export async function connectionSummary(
  provider: IntegrationProvider,
): Promise<ConnectionSummary | null> {
  const row = await db.query.integrationConnections.findFirst({
    where: eq(integrationConnections.provider, provider),
  });
  if (!row) return null;
  return {
    provider: row.provider,
    status: row.status,
    accountLabel: row.accountLabel,
    scopes: row.scopes,
    connectedAt: row.connectedAt,
    expiresAt: row.expiresAt ?? null,
  };
}

/**
 * Decrypt and return the credentials for a provider, or null if absent/invalid.
 * SERVER-ONLY — the returned secret must never be serialized to the client.
 */
export async function getCredentials(
  provider: IntegrationProvider,
): Promise<IntegrationCredentials | null> {
  const row = await db.query.integrationConnections.findFirst({
    where: eq(integrationConnections.provider, provider),
  });
  if (!row) return null;
  const opened = openJson<unknown>(row.credentials);
  if (opened === null) return null;
  const parsed = integrationCredentialsSchema.safeParse(opened);
  return parsed.success ? parsed.data : null;
}

/** Upsert a connection, sealing credentials at the boundary. */
export async function saveConnection(input: {
  provider: IntegrationProvider;
  credentials: IntegrationCredentials;
  accountLabel?: string;
  scopes?: string;
  expiresAt?: number | null;
  status?: "connected" | "error" | "revoked";
}): Promise<void> {
  const now = Date.now();
  const sealed = sealJson(input.credentials);
  const values = {
    provider: input.provider,
    credentials: sealed,
    accountLabel: input.accountLabel ?? "",
    scopes: input.scopes ?? "",
    expiresAt: input.expiresAt ?? null,
    status: input.status ?? ("connected" as const),
    updatedAt: now,
  };
  await db
    .insert(integrationConnections)
    .values(values)
    .onConflictDoUpdate({
      target: integrationConnections.provider,
      set: {
        credentials: values.credentials,
        accountLabel: values.accountLabel,
        scopes: values.scopes,
        expiresAt: values.expiresAt,
        status: values.status,
        updatedAt: now,
      },
    });
}

/**
 * Update just the cached credential blob (e.g. after an access-token refresh)
 * without touching display fields. No-op if the connection is gone.
 */
export async function updateCredentials(
  provider: IntegrationProvider,
  credentials: IntegrationCredentials,
  expiresAt?: number | null,
): Promise<void> {
  await db
    .update(integrationConnections)
    .set({
      credentials: sealJson(credentials),
      expiresAt: expiresAt ?? null,
      updatedAt: Date.now(),
    })
    .where(eq(integrationConnections.provider, provider));
}

/** Remove a connection entirely (disconnect). */
export async function deleteConnection(provider: IntegrationProvider): Promise<void> {
  await db
    .delete(integrationConnections)
    .where(eq(integrationConnections.provider, provider));
}
