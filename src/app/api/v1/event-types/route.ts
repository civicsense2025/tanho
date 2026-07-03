import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listEventTypes } from "@/modules/scheduling/queries";
import { eventTypes } from "@/modules/scheduling/schema";
import { eventTypeSchema } from "@/modules/scheduling/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/** GET /api/v1/event-types — list all event types. Editor+. */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listEventTypes());
  });
}

/** POST /api/v1/event-types — create an event type. Body: eventTypeSchema. Editor+. */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = eventTypeSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid event type", 400);
    }
    const clash = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, parsed.data.slug) });
    if (clash) return fail("That slug is already in use", 409);
    const [row] = await db
      .insert(eventTypes)
      .values(parsed.data)
      .returning({ id: eventTypes.id });
    updateTag("pages");
    await writeAudit({ userId: user.id, action: "scheduling.eventType.create", ownerType: "event_type", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}
