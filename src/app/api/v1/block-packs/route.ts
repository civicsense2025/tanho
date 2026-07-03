import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listEntries } from "@/modules/entries/queries";
import { importBlockPack } from "@/modules/blocks/packs/actions";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/block-packs — list saved/imported block packs.
 * POST /api/v1/block-packs — import a .pack.json body as a new block pack.
 *   Unknown block types are kept as placeholders (never breaks the site);
 *   diagnostics (missingTypes/dropped) are returned in `data`.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listEntries("block_pack"));
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const result = await importBlockPack(body, "imported");
    if (!result.ok) return fail(result.error, 400);
    return ok(result.data, 201);
  });
}
