import { AdminAuthError } from "./admin-or-token";
import { ApiAuthError } from "./api-tokens/guards";

/**
 * Maps an auth error thrown by `requireOwnerSessionOrToken` to a JSON response
 * with the right status. Both the token guard (`ApiAuthError`) and the
 * session-or-token guard (`AdminAuthError`) carry an explicit `status`; anything
 * else is an unexpected server fault (500). Used by the raw-`Response`
 * `/api/admin/*` portability routes, which don't go through the v1 `handle`.
 */
export function authErrorResponse(e: unknown): Response {
  if (e instanceof ApiAuthError || e instanceof AdminAuthError) {
    return Response.json({ ok: false, error: e.message }, { status: e.status });
  }
  console.error("[api/admin] auth error", e);
  return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
}
