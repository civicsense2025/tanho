import { headers } from "next/headers";
import { getAdminUser, type AdminUser } from "./session";
import { requireApiUser } from "./api-tokens/guards";

/**
 * Owner guard for the `/api/admin/*` routes that BOTH the browser admin and the
 * native app hit (portability export/import). Accepts either auth path:
 *
 *  - `Authorization: Bearer <token>` → validated via `requireApiUser` (the same
 *    API-token guard `/api/v1/*` uses), for the native app.
 *  - otherwise the admin session cookie → `getAdminUser`, for a browser
 *    download/upload.
 *
 * Throws (never redirects) so a route handler returns a clean status instead of
 * an HTML login redirect — the native client can't follow a redirect to a
 * cookie-based login. The thrown value carries a `status` so callers can map it.
 */
export class AdminAuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export async function requireOwnerSessionOrToken(): Promise<AdminUser> {
  const auth = (await headers()).get("authorization") ?? "";
  if (/^Bearer\s+/i.test(auth)) {
    // Token path — requireApiUser throws ApiAuthError (has its own status).
    return requireApiUser("owner");
  }
  const user = await getAdminUser();
  if (!user) throw new AdminAuthError(401, "Not signed in");
  if (!user.permissions.has("team:owner")) throw new AdminAuthError(403, "Forbidden: owner role required");
  return user;
}
