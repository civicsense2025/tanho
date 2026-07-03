import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { activateTheme, deleteTheme } from "@/modules/theme/actions";
import { handle, ok, fail } from "@/lib/api/v1";

/**
 * POST /api/v1/theme/presets/:id/activate — copy this preset's scalars into
 *   the active theme (the singleton row the renderer reads).
 * DELETE /api/v1/theme/presets/:id — delete a preset. Built-ins can't be deleted.
 *
 * Both dispatch on a trailing action segment isn't used here — POST always
 * means activate for this resource (there's nothing else to POST).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { id } = await params;
    const result = await activateTheme(id);
    if (!result.ok) return fail(result.error, 400);
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { id } = await params;
    const result = await deleteTheme(id);
    if (!result.ok) return fail(result.error, 400);
    return ok();
  });
}
