import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listPeople, type Segment } from "@/modules/people/queries";
import { people } from "@/modules/people/schema";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/people — list people. Optional ?segment=&search= filters.
 * POST /api/v1/people — create one person (natural key: email). Editor+.
 *
 * The POST exists so external clients — notably the hub migration tool — can
 * upsert imported subscribers/members over REST (previously people creation was
 * Server-Action-only). Idempotent on email: a re-post of an existing email is a
 * 409, never a duplicate.
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

const createPersonSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().max(120).optional().default(""),
  kind: z.enum(["member", "subscriber", "lead"]).optional().default("subscriber"),
  note: z.string().max(2000).optional().default(""),
});

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = createPersonSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid person", 400);
    }
    const email = parsed.data.email.trim().toLowerCase();
    const clash = await db.query.people.findFirst({ where: eq(people.email, email) });
    if (clash) return fail(`A person with email "${email}" already exists`, 409);
    const [row] = await db
      .insert(people)
      .values({ email, name: parsed.data.name || email, kind: parsed.data.kind, notes: parsed.data.note })
      .returning({ id: people.id });
    await writeAudit({ userId: user.id, action: "person.create", ownerType: "person", ownerId: row!.id });
    return ok({ id: row!.id }, 201);
  });
}
