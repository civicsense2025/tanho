import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { exportDesignPack, deleteDesignPack } from "@/modules/blocks/design-packs/actions";
import { handle, ok, fail } from "@/lib/api/v1";

/**
 * GET /api/v1/design-packs/:id — export as a portable pack object
 *   (lamina-pack@1, kind: "design-pack").
 * DELETE /api/v1/design-packs/:id — delete a design pack.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const result = await exportDesignPack(id);
    if (!result.ok) return fail(result.error, 404);
    return ok(result.data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { id } = await params;
    const result = await deleteDesignPack(id);
    if (!result.ok) return fail(result.error, 400);
    return ok();
  });
}
