"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { getDataSourceAdapter } from "@/adapters/data-source";
import type { TableDesc } from "@/adapters/types";
import { sealConnectionConfig, openConnectionConfig } from "./crypto";
import { getConnection } from "./queries";
import { allowDataSourceMutation } from "./rate-limit";
import { dataSourceConnections } from "./schema";
import {
  createConnectionSchema,
  updateConnectionSchema,
  type CreateConnectionInput,
  type UpdateConnectionInput,
} from "./validation";

export type ConnectionActionState =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type TestConnectionState =
  | { ok: true }
  | { ok: false; error: string };

export type SuggestAllowlistState =
  | { ok: true; tables: TableDesc[] }
  | { ok: false; error: string };

/**
 * Never surface a raw driver error (which can contain hosts, usernames, or
 * fragments of a connection string) to the admin UI or logs. Log a generic
 * marker server-side only; return a fixed, safe message to the caller.
 */
function redactedFailure(context: string, err: unknown): { ok: false; error: string } {
  console.error(`[data-sources] ${context} failed`, err instanceof Error ? err.message : "unknown error");
  return { ok: false, error: "Connection failed. Check the host, credentials, and network access." };
}

/** Create a new external data-source connection (owner-only, audited, rate-limited). */
export async function createConnection(input: CreateConnectionInput): Promise<ConnectionActionState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const parsed = createConnectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid connection" };
  }

  const [row] = await db
    .insert(dataSourceConnections)
    .values({
      name: parsed.data.name,
      provider: parsed.data.config.provider,
      configEncrypted: sealConnectionConfig(parsed.data.config),
      allowlistJson: [],
      status: "unverified",
      createdBy: user.id,
    })
    .returning({ id: dataSourceConnections.id });

  updateTag("data-sources");
  await writeAudit({
    userId: user.id,
    action: "data_source.create",
    ownerType: "data_source",
    ownerId: row!.id,
  });
  return { ok: true, id: row!.id };
}

/** Update a connection's name/config/allowlist (owner-only, audited, rate-limited). */
export async function updateConnection(input: UpdateConnectionInput): Promise<ConnectionActionState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const parsed = updateConnectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid connection" };
  }

  const existing = await getConnection(parsed.data.id);
  if (!existing) return { ok: false, error: "Connection not found" };

  await db
    .update(dataSourceConnections)
    .set({
      name: parsed.data.name ?? existing.name,
      ...(parsed.data.config
        ? { provider: parsed.data.config.provider, configEncrypted: sealConnectionConfig(parsed.data.config) }
        : {}),
      ...(parsed.data.allowlist ? { allowlistJson: parsed.data.allowlist } : {}),
      updatedAt: Date.now(),
    })
    .where(eq(dataSourceConnections.id, parsed.data.id));

  updateTag("data-sources");
  updateTag(`data-source:${parsed.data.id}`);
  await writeAudit({
    userId: user.id,
    action: "data_source.update",
    ownerType: "data_source",
    ownerId: parsed.data.id,
  });
  return { ok: true, id: parsed.data.id };
}

/** Delete a connection (owner-only, audited). Bound blocks referencing it will fail closed. */
export async function deleteConnection(id: string): Promise<ConnectionActionState> {
  const user = await requireUser("owner");
  await db.delete(dataSourceConnections).where(eq(dataSourceConnections.id, id));

  updateTag("data-sources");
  updateTag(`data-source:${id}`);
  await writeAudit({
    userId: user.id,
    action: "data_source.delete",
    ownerType: "data_source",
    ownerId: id,
  });
  return { ok: true, id };
}

/**
 * Verify a connection actually connects (owner-only, audited, rate-limited).
 * Updates `status` on success/failure but never leaks driver error detail.
 */
export async function testConnection(id: string): Promise<TestConnectionState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const row = await getConnection(id);
  if (!row) return { ok: false, error: "Connection not found" };

  const config = openConnectionConfig(row.configEncrypted);
  if (!config) return redactedFailure("decrypt", new Error("could not open sealed config"));

  try {
    const adapter = getDataSourceAdapter({ provider: row.provider, config });
    const result = await adapter.testConnection();
    await db
      .update(dataSourceConnections)
      .set({ status: result.ok ? "connected" : "error", updatedAt: Date.now() })
      .where(eq(dataSourceConnections.id, id));

    await writeAudit({
      userId: user.id,
      action: "data_source.test",
      ownerType: "data_source",
      ownerId: id,
      meta: { ok: result.ok },
    });

    if (!result.ok) return { ok: false, error: "Connection failed. Check the host, credentials, and network access." };
    return { ok: true };
  } catch (err) {
    await db
      .update(dataSourceConnections)
      .set({ status: "error", updatedAt: Date.now() })
      .where(eq(dataSourceConnections.id, id));
    return redactedFailure("testConnection", err);
  }
}

/**
 * Introspect a connection's available tables/columns for the allowlist editor
 * (owner-only). Purely informational — returning a table here does not grant
 * it any access; only what's saved into `allowlistJson` via `updateConnection`
 * is ever consulted at query time.
 */
export async function suggestAllowlist(connectionId: string): Promise<SuggestAllowlistState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const row = await getConnection(connectionId);
  if (!row) return { ok: false, error: "Connection not found" };

  const config = openConnectionConfig(row.configEncrypted);
  if (!config) return redactedFailure("decrypt", new Error("could not open sealed config"));

  try {
    const adapter = getDataSourceAdapter({ provider: row.provider, config });
    const tables = await adapter.listTables();
    return { ok: true, tables };
  } catch (err) {
    return redactedFailure("suggestAllowlist", err);
  }
}
