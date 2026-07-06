import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getEventTypeById } from "@/modules/scheduling/queries";
import { eventTypes } from "@/modules/scheduling/schema";
import { eventTypeSchema } from "@/modules/scheduling/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/event-types/:id — one event type. Editor+.
 * PATCH /api/v1/event-types/:id — update (partial). Editor+.
 * DELETE /api/v1/event-types/:id — delete. Owner-only.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const row = await getEventTypeById(id);
    if (!row) return fail("Event type not found", 404);
    return ok(row);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.eventTypes.findFirst({ where: eq(eventTypes.id, id) });
    if (!existing) return fail("Event type not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = eventTypeSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid event type", 400);
    }
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const clash = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, parsed.data.slug) });
      if (clash) return fail("That slug is already in use", 409);
    }
    await db.update(eventTypes).set(parsed.data).where(eq(eventTypes.id, id));
    revalidateTag("pages", "max");
    await writeAudit({ userId: user.id, action: "scheduling.eventType.update", ownerType: "event_type", ownerId: id });
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(eventTypes).where(eq(eventTypes.id, id));
    revalidateTag("pages", "max");
    await writeAudit({ userId: user.id, action: "scheduling.eventType.delete", ownerType: "event_type", ownerId: id });
    return ok();
  });
}
