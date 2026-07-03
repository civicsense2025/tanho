"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { apiTokens } from "./schema";
import { generateApiToken, hashApiToken, tokenPrefix } from "./tokens";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export type ApiTokenRow = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: number | null;
  expiresAt: number | null;
  createdAt: number;
};

/**
 * Mint a new API token. The raw token is returned ONCE here — only the
 * SHA-256 hash is persisted. Owner-only, because API tokens carry the owner's
 * full authorization surface.
 */
export async function createApiToken(name: string): Promise<Result<{ token: string; row: ApiTokenRow }>> {
  const user = await requireUser("owner");
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    return { ok: false, error: "Give the token a name (1–80 chars)" };
  }
  const raw = generateApiToken();
  const [row] = await db
    .insert(apiTokens)
    .values({
      userId: user.id,
      name: trimmed,
      tokenHash: hashApiToken(raw),
      prefix: tokenPrefix(raw),
    })
    .returning({ id: apiTokens.id, createdAt: apiTokens.createdAt });
  await writeAudit({ userId: user.id, action: "api_token.create", ownerType: "api_token", ownerId: row!.id });
  return {
    ok: true,
    data: {
      token: raw,
      row: {
        id: row!.id,
        name: trimmed,
        prefix: tokenPrefix(raw),
        lastUsedAt: null,
        expiresAt: null,
        createdAt: row!.createdAt,
      },
    },
  };
}

export async function listApiTokens(): Promise<Result<ApiTokenRow[]>> {
  const user = await requireUser("owner");
  const rows = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, user.id))
    .all();
  return { ok: true, data: rows };
}

export async function revokeApiToken(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(apiTokens).where(eq(apiTokens.id, id));
  await writeAudit({ userId: user.id, action: "api_token.revoke", ownerType: "api_token", ownerId: id });
  return { ok: true };
}
