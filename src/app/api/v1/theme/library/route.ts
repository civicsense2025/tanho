import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { handle, ok } from "@/lib/api/v1";

/**
 * GET /api/v1/theme/library — the curated theme catalog (same JSON served at
 * /theme-library/index.json for the browser admin's ThemeLibrary component).
 * Proxied under /api/v1 so API clients (like the Swift app) have one
 * consistent, bearer-authenticated surface instead of reaching for a public
 * static path. Degrades to an empty list if the catalog file is absent.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const origin = new URL(req.url).origin;
    const res = await fetch(new URL("/theme-library/index.json", origin));
    if (!res.ok) return ok({ themes: [] });
    const data = await res.json();
    return ok({ themes: Array.isArray(data?.themes) ? data.themes : [] });
  });
}
