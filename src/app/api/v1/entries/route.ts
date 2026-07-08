import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listEntries } from "@/modules/entries/queries";
import { handle, ok, fail } from "../_lib";

/**
 * GET /api/v1/entries — list entries of a type. Required ?type= (e.g. project,
 * guide, custom:my-type). Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const type = new URL(req.url).searchParams.get("type");
    if (!type) return fail("Missing required ?type= parameter", 400);
    return ok(await listEntries(type));
  });
}
