"use server";

import { createId } from "@paralleldrive/cuid2";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { storage } from "@/adapters/storage";
import { media, mediaUsage } from "./schema";
import { storeMediaBytes, type MediaRow } from "./store";
import { matchesSignature } from "./signature";
import { sanitizeSvg } from "./svg-sanitize";
import { MAX_UPLOAD_BYTES, MIME_TO_EXT, mediaPatchSchema } from "./validation";
import {
  listPublicAssets,
  publicAssetExists,
  safePublicName,
  writePublicAsset,
} from "./public-assets";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Upload one file. Validation, magic-byte sniffing, SVG sanitization, storage,
 * and the media row all live in storeMediaBytes (shared with the fonts flow);
 * this action resolves the user, extracts the file, and writes the audit entry.
 */
export async function uploadMedia(formData: FormData): Promise<Result<MediaRow>> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storeMediaBytes(bytes, file.type, file.name);
  if (!stored.ok) return stored;

  await writeAudit({
    userId: user.id,
    action: "media.upload",
    ownerType: "media",
    ownerId: stored.row.id,
    meta: { key: stored.row.storageKey, mime: stored.row.mime, size: stored.row.size },
  });
  return { ok: true, data: stored.row };
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

/** Read action for the fonts manager — font-kind assets, newest first. */
export async function listFontMediaAction(): Promise<Result<PickerItem[]>> {
  await requireUser();
  const rows = await db.query.media.findMany({
    where: eq(media.kind, "font"),
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

/**
 * Read action for the picker's "Public" tab — link-worthy files under the app's
 * `/public` folder (a self-hoster's own static assets), served at their own URL
 * (`/logo.svg`), no DB. Admin-only (reveals folder structure). Shaped like
 * PickerItem so the picker renders both sources uniformly.
 */
export async function listPublicAssetsAction(): Promise<Result<PickerItem[]>> {
  await requireUser();
  const assets = await listPublicAssets();
  return {
    ok: true,
    data: assets.map((a) => ({ id: a.url, name: a.name, alt: "", url: a.url })),
  };
}

/**
 * Upload a file directly INTO `/public` (vs the DB-tracked media store). Same
 * fail-closed gauntlet as storeMediaBytes — auth, size cap, MIME allowlist,
 * magic-byte signature, and SVG sanitization (an SVG written to /public is
 * DOMPurify-sanitized first, exactly like a stored upload) — then a safe
 * filename whose extension comes from the MIME map (never the user's), confined
 * to the public root. Refuses to overwrite; on a name clash, suffixes a unique
 * token. Returns the served static URL (`/name.ext`).
 */
export async function uploadToPublicAction(formData: FormData): Promise<Result<{ url: string }>> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  if (file.size === 0) return { ok: false, error: "File is empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is larger than 15MB" };
  const ext = MIME_TO_EXT[file.type];
  if (!ext) return { ok: false, error: "Unsupported file type" };

  let bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(file.type, bytes)) {
    return { ok: false, error: "File content does not match its type" };
  }
  // SVG going to /public is sanitized identically to a stored SVG upload —
  // scripts/foreignObject/external refs stripped before it ever touches disk.
  if (file.type === "image/svg+xml") {
    const clean = sanitizeSvg(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
    if (!clean) return { ok: false, error: "SVG could not be safely sanitized" };
    bytes = new TextEncoder().encode(clean);
  }

  // Build the suffixed name from the already-sanitised stem + trusted ext
  // directly (NOT by re-running safePublicName, whose extension-strip would eat
  // the token on a dotted name). Loop so the retry name is genuinely free.
  let name = safePublicName(file.name, ext);
  const stem = name.replace(new RegExp(`\\.${ext}$`), "");
  for (let tries = 0; (await publicAssetExists(name)) && tries < 5; tries++) {
    name = `${stem}-${createId().slice(0, 6)}.${ext}`;
  }

  let url: string;
  try {
    url = await writePublicAsset(name, bytes);
  } catch {
    return { ok: false, error: "Could not write the file" };
  }
  await writeAudit({
    userId: user.id,
    action: "media.upload.public",
    ownerType: "media",
    ownerId: name,
    meta: { name, mime: file.type, size: file.size },
  });
  return { ok: true, data: { url } };
}
