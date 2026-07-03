import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listMedia } from "@/modules/media/queries";
import { handle, ok } from "@/lib/api/v1";

/**
 * GET /api/v1/media — list media assets. Optional ?kind=image|video|doc filter.
 * Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") as "image" | "video" | "doc" | null;
    return ok(await listMedia(kind ? { kind } : {}));
  });
}
