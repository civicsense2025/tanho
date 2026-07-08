import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getPerson } from "@/modules/people/queries";
import { people } from "@/modules/people/schema";
import { personPatchSchema } from "@/modules/people/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { handle, ok, fail, parseBody } from "../../_lib";

/**
 * GET /api/v1/people/:id — full profile (activity, memberships, subscriptions).
 * PATCH /api/v1/people/:id — update a person (partial personPatchSchema). Editor+.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getPerson(id);
    if (!data) return fail("Person not found", 404);
    return ok(data);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = personPatchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid person patch", 400);
    }
    await db.update(people).set(parsed.data).where(eq(people.id, id));
    await writeAudit({ userId: user.id, action: "person.update", ownerType: "person", ownerId: id });
    return ok();
  });
}
