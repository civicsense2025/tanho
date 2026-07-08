import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getEntryForEdit } from "@/modules/entries/queries";
import { handle, ok, fail } from "../../_lib";

/** GET /api/v1/entries/:id — one entry with draft/published blocks. Editor+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getEntryForEdit(id);
    if (!data) return fail("Entry not found", 404);
    return ok(data);
  });
}
