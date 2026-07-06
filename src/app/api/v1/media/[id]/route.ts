import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { media, mediaUsage } from "@/modules/media/schema";
import { storeMediaBytes } from "@/modules/media/store";
import { mediaPatchSchema } from "@/modules/media/validation";
import { storage } from "@/adapters/storage";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * POST /api/v1/media — multipart upload (field `file`). Delegates to
 * storeMediaBytes (the shared core: allowlist + magic-byte signature + SVG
 * sanitization + font `kind` routing + storage), so it stays in lockstep with
 * the admin uploadMedia action. Editor+.
 *
 * PATCH /api/v1/media/:id — update editable metadata (alt, tags, credit, …).
 * DELETE /api/v1/media/:id — remove the row, usage index, and stored file.
 */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file provided", 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storeMediaBytes(bytes, file.type, file.name);
    if (!stored.ok) return fail(stored.error, 415);

    await writeAudit({
      userId: user.id,
      action: "media.upload",
      ownerType: "media",
      ownerId: stored.row.id,
      meta: { key: stored.row.storageKey, mime: stored.row.mime, size: stored.row.size },
    });
    return ok(stored.row, 201);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = mediaPatchSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid metadata", 400);
    if (Object.keys(parsed.data).length === 0) return ok();
    const existing = await db.query.media.findFirst({ where: eq(media.id, id) });
    if (!existing) return fail("Media not found", 404);
    await db.update(media).set(parsed.data).where(eq(media.id, id));
    await writeAudit({ userId: user.id, action: "media.update", ownerType: "media", ownerId: id });
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const row = await db.query.media.findFirst({ where: eq(media.id, id) });
    if (!row) return fail("Media not found", 404);
    await db.delete(mediaUsage).where(eq(mediaUsage.mediaId, id));
    await db.delete(media).where(eq(media.id, id));
    await storage.delete(row.storageKey);
    await writeAudit({ userId: user.id, action: "media.delete", ownerType: "media", ownerId: id, meta: { key: row.storageKey, name: row.name } });
    return ok();
  });
}
