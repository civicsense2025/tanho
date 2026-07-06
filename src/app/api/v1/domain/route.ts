import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getDomainSettings } from "@/modules/domain/queries";
import { runDomainCheck } from "@/modules/domain/check";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/** GET /api/v1/domain — current custom domain + verification status. Owner-only. */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    return ok(await getDomainSettings());
  });
}

/**
 * POST /api/v1/domain — trigger a fresh DNS check. Body: { action: "check" }.
 * Owner-only. Returns the updated DomainSettings.
 */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const body = await parseBody<{ action?: string }>(req);
    if (body?.action !== "check") return fail("Unsupported action", 400);
    const res = await runDomainCheck(user.id);
    if (res.error) return fail(res.error, 400);
    return ok(res.data);
  });
}
