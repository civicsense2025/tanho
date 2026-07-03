import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { exportBlockPack, deleteBlockPack } from "@/modules/blocks/packs/actions";
import { handle, ok, fail } from "@/lib/api/v1";

/**
 * GET /api/v1/block-packs/:id — export the published block tree as a
 *   portable pack object (oys-pack@1, kind: "block-pack").
 * DELETE /api/v1/block-packs/:id — delete a block pack and its block trees.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const result = await exportBlockPack(id);
    if (!result.ok) return fail(result.error, 404);
    return ok(result.data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const result = await deleteBlockPack(id);
    if (!result.ok) return fail(result.error, 400);
    return ok();
  });
}
