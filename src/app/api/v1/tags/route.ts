import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listTagsWithCounts } from "@/modules/tags/queries";
import { tags } from "@/modules/tags/schema";
import { createTagSchema } from "@/modules/tags/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/tags — list all tags with usage counts. Editor+.
 * POST /api/v1/tags — create a tag. Body: createTagSchema. Editor+.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listTagsWithCounts());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid tag", 400);
    }
    const existing = await db.query.tags.findFirst({ where: eq(tags.name, parsed.data.name) });
    if (existing) return fail("A tag with that name already exists", 409);
    const [row] = await db.insert(tags).values({ name: parsed.data.name }).returning({ id: tags.id });
    await writeAudit({ userId: user.id, action: "tag.create", ownerType: "tag", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}
