import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listPeople, type Segment } from "@/modules/people/queries";
import { handle, ok } from "@/lib/api/v1";

/**
 * GET /api/v1/people — list people. Optional ?segment=&search= filters.
 * Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const segment = (url.searchParams.get("segment") as Segment | null) ?? "all-active";
    const search = url.searchParams.get("search") ?? undefined;
    return ok(await listPeople(segment, search));
  });
}
