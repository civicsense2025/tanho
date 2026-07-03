import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getEntryForEdit } from "@/modules/entries/queries";
import { entries } from "@/modules/entries/schema";
import { entryDetailsSchema } from "@/modules/entries/validation";
import { blockSets } from "@/modules/pages/schema";
import { getEntitySchema } from "@/entities/registry-async";
import { db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidate = (type: string) => {
  updateTag("entries");
  updateTag(`entries:${type}`);
};

/** GET /api/v1/entries/:id — one entry with draft/published blocks. Editor+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getEntryForEdit(id);
    if (!data) return fail("Entry not found", 404);
    return ok(data);
  });
}

/**
 * PATCH /api/v1/entries/:id — update entry details (partial). `type` is immutable.
 * If `data` is present it is validated against the entity schema. Editor+.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
    if (!existing) return fail("Entry not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = entryDetailsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid entry", 400);
    }
    const patch: Record<string, unknown> = { ...parsed.data, updatedAt: Date.now() };
    // `type` is immutable — an entry's data schema is fixed at creation.
    delete patch.type;
    if ("data" in (body as object)) {
      const schema = await getEntitySchema(existing.type);
      if (!schema) return fail(`Unknown content type: ${existing.type}`, 400);
      const dataParsed = schema.dataSchema.safeParse((body as { data?: unknown }).data ?? {});
      if (!dataParsed.success) {
        return fail(dataParsed.error.issues[0]?.message ?? "Invalid content", 400);
      }
      patch.data = dataParsed.data as Record<string, unknown>;
    }
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const dupe = await db.query.entries.findFirst({
        where: and(eq(entries.type, existing.type), eq(entries.slug, parsed.data.slug)),
      });
      if (dupe) return fail(`Slug ${parsed.data.slug} is already in use`, 409);
    }
    await db.update(entries).set(patch).where(eq(entries.id, id));
    await writeAudit({ userId: user.id, action: "entry.update", ownerType: `entry:${existing.type}`, ownerId: id });
    invalidate(existing.type);
    return ok();
  });
}

/** DELETE /api/v1/entries/:id — delete an entry and its block sets. Editor+. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
    if (!existing) return fail("Entry not found", 404);
    await db
      .delete(blockSets)
      .where(and(eq(blockSets.ownerType, `entry:${existing.type}`), eq(blockSets.ownerId, id)));
    await db.delete(entries).where(eq(entries.id, id));
    await writeAudit({ userId: user.id, action: "entry.delete", ownerType: `entry:${existing.type}`, ownerId: id });
    invalidate(existing.type);
    return ok();
  });
}
