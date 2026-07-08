import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listEventTypes } from "@/modules/scheduling/queries";
import { handle, ok } from "../_lib";

/** GET /api/v1/event-types — list all event types. Editor+. */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listEventTypes());
  });
}
