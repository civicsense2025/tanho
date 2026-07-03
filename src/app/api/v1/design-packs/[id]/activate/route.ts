import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { activateDesignPack } from "@/modules/blocks/design-packs/actions";
import { handle, ok, fail } from "@/lib/api/v1";

/**
 * POST /api/v1/design-packs/:id/activate — apply the pack's theme to the
 * active theme and create its pages (routes already in use are skipped, not
 * overwritten). Owner-only, mirrors the admin activate action.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { id } = await params;
    const result = await activateDesignPack(id);
    if (!result.ok) return fail(result.error, 400);
    return ok(result.data);
  });
}
