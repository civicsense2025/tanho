import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import { apiTokens } from "./schema";
import { users } from "../schema";
import { hashApiToken } from "./tokens";
import { isApiTokenRateLimited, recordFailedApiTokenAttempt } from "./rate-limit";
import type { AdminUser } from "../session";
import { resolvePermissions } from "../guards";

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
  const ip = clientIp(hdrs);

  // Fail fast if this IP has already burned the failed-attempt budget. This is a
  // read-only check: a successful request below never touches the counter, so a
  // legitimate high-volume client (e.g. a bulk import) is not throttled — only a
  // credential-guesser who keeps sending bad tokens is.
  if (await isApiTokenRateLimited(ip)) {
    throw new ApiAuthError(401, "Too many attempts. Try again in a minute.");
  }

  // A credential-guessing attempt is a MISSING or WRONG token; record those (and
  // only those) against the limiter. A valid token that merely lacks the owner
  // role (403 below) is authenticated, not a brute-force signal, so it isn't.
  const failAuth = async (message: string): Promise<never> => {
    await recordFailedApiTokenAttempt(ip);
    throw new ApiAuthError(401, message);
  };

  const auth = hdrs.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return failAuth("Missing or malformed Authorization header");
  }
  const token = match[1].trim();
  const tokenHash = hashApiToken(token);

  const [row] = await db
    .select({
      tokenId: apiTokens.id,
      tokenExpiresAt: apiTokens.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      roleId: users.roleId,
      status: users.status,
    })
    .from(apiTokens)
    .innerJoin(users, eq(apiTokens.userId, users.id))
    .where(eq(apiTokens.tokenHash, tokenHash));

  if (!row || row.status !== "active") {
    return failAuth("Invalid or revoked API token");
  }
  if (row.tokenExpiresAt && row.tokenExpiresAt < Date.now()) {
    return failAuth("API token has expired");
  }
  // Resolve permissions once — reused for both the owner check and the
  // return value (avoids a duplicate DB query for owner-token requests).
  const permissions = await resolvePermissions(row.roleId);
  if (role === "owner" && !permissions.has("team:owner")) {
    throw new ApiAuthError(403, "Forbidden: owner role required");
  }

  // Fire-and-forget lastUsedAt stamp — never blocks the request.
  db.update(apiTokens)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiTokens.id, row.tokenId))
    .then(undefined, (e) => console.error("[api-token] lastUsedAt stamp failed", e));

  return { id: row.userId, email: row.email, name: row.name, role: row.role, permissions };
}
