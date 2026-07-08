import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listBookings, type BookingSegment } from "@/modules/scheduling/queries";
import { handle, ok } from "../_lib";

/**
 * GET /api/v1/bookings — list bookings. Optional ?segment=upcoming|past|cancelled.
 * Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const segment = (url.searchParams.get("segment") as BookingSegment | null) ?? "upcoming";
    return ok(await listBookings(segment));
  });
}
