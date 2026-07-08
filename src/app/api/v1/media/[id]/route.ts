import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { media, mediaUsage } from "@/modules/media/schema";
import { matchesSignature } from "@/modules/media/signature";
import { MAX_UPLOAD_BYTES, MIME_TO_EXT, mediaPatchSchema, sanitizeFilename } from "@/modules/media/validation";
import { storage } from "@/adapters/storage";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { handle, ok, fail, parseBody } from "../../_lib";

const kindOf = (mime: string): "image" | "video" | "doc" =>
  mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "doc";

/**
 * POST /api/v1/media — multipart upload (field `file`). Mirrors `uploadMedia`:
 * server-generated storage key, magic-byte signature check, sanitized name.
 * Editor+.
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
    if (file.size === 0) return fail("File is empty", 400);
    if (file.size > MAX_UPLOAD_BYTES) return fail("File is larger than 15MB", 413);
    const ext = MIME_TO_EXT[file.type];
    if (!ext) return fail("Unsupported file type", 415);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesSignature(file.type, bytes)) return fail("File content does not match its type", 415);

    const key = `${createId()}.${ext}`;
    await storage.put(key, bytes, file.type);
    const [row] = await db
      .insert(media)
      .values({
        storageKey: key,
        name: sanitizeFilename(file.name),
        kind: kindOf(file.type),
        mime: file.type,
        size: file.size,
      })
      .returning();
    await writeAudit({ userId: user.id, action: "media.upload", ownerType: "media", ownerId: row.id, meta: { key, mime: file.type, size: file.size } });
    return ok(row, 201);
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
