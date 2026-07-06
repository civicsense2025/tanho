import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listEntries } from "@/modules/entries/queries";
import { entries } from "@/modules/entries/schema";
import { entryDetailsSchema } from "@/modules/entries/validation";
import { getEntitySchema } from "@/entities/registry-async";
import { db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidate = (type: string) => {
  revalidateTag("entries", "max");
  revalidateTag(`entries:${type}`, "max");
};

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

/**
 * POST /api/v1/entries — create an entry. Body: { type, ...entryDetailsSchema, data? }.
 * The `data` record is validated against the registered entity schema for the type.
 * Editor+. Returns { id } 201.
 */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = entryDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid entry", 400);
    }
    const details = parsed.data;
    const schema = await getEntitySchema(details.type);
    if (!schema) return fail(`Unknown content type: ${details.type}`, 400);
    const dataParsed = schema.dataSchema.safeParse((body as { data?: unknown })?.data ?? {});
    if (!dataParsed.success) {
      return fail(dataParsed.error.issues[0]?.message ?? "Invalid content", 400);
    }
    const dupe = await db.query.entries.findFirst({
      where: and(eq(entries.type, details.type), eq(entries.slug, details.slug)),
    });
    if (dupe) return fail(`Slug ${details.slug} is already in use`, 409);
    const [row] = await db
      .insert(entries)
      .values({ ...details, data: dataParsed.data as Record<string, unknown>, updatedAt: Date.now() })
      .returning({ id: entries.id });
    await writeAudit({ userId: user.id, action: "entry.create", ownerType: `entry:${details.type}`, ownerId: row.id });
    invalidate(details.type);
    return ok({ id: row.id }, 201);
  });
}
