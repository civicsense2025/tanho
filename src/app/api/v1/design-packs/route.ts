import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listEntries } from "@/modules/entries/queries";
import { importDesignPack } from "@/modules/blocks/design-packs/actions";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/design-packs — list saved/imported design packs (theme + page templates).
 * POST /api/v1/design-packs — import a .pack.json body as a new design pack.
 *   Owner-only, same as the admin import action. Does not activate it.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listEntries("design_pack"));
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const result = await importDesignPack(body, "imported");
    if (!result.ok) return fail(result.error, 400);
    return ok(result.data, 201);
  });
}
