import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiTokens } from "./schema";
import { users } from "../schema";
import { hashApiToken } from "./tokens";
import type { AdminUser } from "../session";

/**
 * Thrown when a bearer token is missing, invalid, expired, or belongs to a
 * disabled user. Route handlers catch this and return 401/403 — it NEVER
 * redirects (unlike the cookie-based `requireUser`, which is for browser
 * pages).
 */
export class ApiAuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

/**
 * Bearer-token guard for `/api/v1/*` route handlers. Validates the
 * `Authorization: Bearer <token>` header, looks up the matching api_tokens row
 * by SHA-256 hash, loads the admin user, enforces the optional owner-only
 * gate, and stamps `lastUsedAt`. Mirrors `requireUser(role?)` semantics so the
 * same role-based authorization model applies to API clients as to the
 * browser admin panel.
 */
export async function requireApiUser(role?: "owner"): Promise<AdminUser> {
  const hdrs = await headers();
  const auth = hdrs.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new ApiAuthError(401, "Missing or malformed Authorization header");
  }
  const token = match[1].trim();
  const tokenHash = hashApiToken(token);

  const row = await db
    .select({
      tokenId: apiTokens.id,
      tokenExpiresAt: apiTokens.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(apiTokens)
    .innerJoin(users, eq(apiTokens.userId, users.id))
    .where(eq(apiTokens.tokenHash, tokenHash))
    .get();

  if (!row || row.status !== "active") {
    throw new ApiAuthError(401, "Invalid or revoked API token");
  }
  if (row.tokenExpiresAt && row.tokenExpiresAt < Date.now()) {
    throw new ApiAuthError(401, "API token has expired");
  }
  if (role === "owner" && row.role !== "owner") {
    throw new ApiAuthError(403, "Forbidden: owner role required");
  }

  // Fire-and-forget lastUsedAt stamp — never blocks the request.
  db.update(apiTokens)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiTokens.id, row.tokenId))
    .then(undefined, (e) => console.error("[api-token] lastUsedAt stamp failed", e));

  return { id: row.userId, email: row.email, name: row.name, role: row.role };
}
