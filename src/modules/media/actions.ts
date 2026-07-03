"use server";

import { createId } from "@paralleldrive/cuid2";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { storage } from "@/adapters/storage";
import { media, mediaUsage } from "./schema";
import { matchesSignature } from "./signature";
import { MAX_UPLOAD_BYTES, MIME_TO_EXT, mediaPatchSchema, sanitizeFilename } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export type MediaRow = typeof media.$inferSelect;

const kindOf = (mime: string): "image" | "video" | "doc" =>
  mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "doc";

/**
 * Upload one file. The storage key is server-generated (`${cuid2}.${ext}`
 * with the extension from the MIME allowlist) — the user's filename is
 * sanitized and kept for display only. Declared MIME must pass the
 * magic-byte signature check before anything touches disk.
 */
export async function uploadMedia(formData: FormData): Promise<Result<MediaRow>> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  if (file.size === 0) return { ok: false, error: "File is empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is larger than 15MB" };
  const ext = MIME_TO_EXT[file.type];
  if (!ext) return { ok: false, error: "Unsupported file type" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(file.type, bytes)) {
    return { ok: false, error: "File content does not match its type" };
  }

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
  await writeAudit({
    userId: user.id,
    action: "media.upload",
    ownerType: "media",
    ownerId: row.id,
    meta: { key, mime: file.type, size: file.size },
  });
  return { ok: true, data: row };
}

/** Patch editable metadata (alt, tags, credit, source, sourceUrl, license). */
export async function updateMedia(id: string, patch: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = mediaPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid metadata" };
  }
  if (Object.keys(parsed.data).length === 0) return { ok: true };
  const existing = await db.query.media.findFirst({ where: eq(media.id, id) });
  if (!existing) return { ok: false, error: "Media not found" };
  await db.update(media).set(parsed.data).where(eq(media.id, id));
  await writeAudit({ userId: user.id, action: "media.update", ownerType: "media", ownerId: id });
  return { ok: true };
}

/** Remove the row, its usage index rows, and the stored file. */
export async function deleteMedia(id: string): Promise<Result> {
  const user = await requireUser();
  const row = await db.query.media.findFirst({ where: eq(media.id, id) });
  if (!row) return { ok: false, error: "Media not found" };
  await db.delete(mediaUsage).where(eq(mediaUsage.mediaId, id));
  await db.delete(media).where(eq(media.id, id));
  await storage.delete(row.storageKey);
  await writeAudit({
    userId: user.id,
    action: "media.delete",
    ownerType: "media",
    ownerId: id,
    meta: { key: row.storageKey, name: row.name },
  });
  return { ok: true };
}

export type PickerItem = { id: string; name: string; alt: string; url: string };

/** Read action for the MediaPicker modal — image-kind assets, newest first. */
export async function listImageMediaAction(): Promise<Result<PickerItem[]>> {
  await requireUser();
  const rows = await db.query.media.findMany({
    where: eq(media.kind, "image"),
    orderBy: [desc(media.createdAt)],
  });
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      alt: r.alt,
      url: storage.publicUrl(r.storageKey),
    })),
  };
}
