"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { unzipSync } from "fflate";
import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { storage } from "@/adapters/storage";
import { media } from "@/modules/media/schema";
import { storeMediaBytes } from "@/modules/media/store";
import { theme } from "@/modules/theme/schema";
import { fontFaces, fontFamilies } from "./schema";
import { cssStackFor } from "./css";
import { parseFontMeta, type FontMeta } from "./fontkit-meta";
import { fetchGoogleFontFaces, googleFontDef } from "./google";
import { createFamilySchema, googleFontSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Ext → font MIME, for storing font bytes with the right content type. */
const FONT_EXT_TO_MIME: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

const extFromName = (name: string): string => name.split(".").pop()?.toLowerCase() ?? "";

/** A parsed, stored font file ready to be turned into a face. */
export type StagedFace = {
  mediaId: string;
  url: string;
  sizeBytes: number;
  ext: string;
  fileName: string;
  meta: FontMeta | null;
};

// ── Uploading raw font files (drag files or a folder) ─────────────────────────

/**
 * Store one or more uploaded font files as media(kind:"font") and return their
 * parsed metadata so the client can build the family/weight/style matching
 * table. Does NOT create families/faces yet — the owner confirms the grouping,
 * then calls createFamilyFromFaces.
 */
export async function uploadFontFiles(formData: FormData): Promise<Result<StagedFace[]>> {
  const user = await requireUser("owner");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, error: "No font files provided" };
  if (files.length > 64) return { ok: false, error: "Too many files at once (max 64)" };

  const staged: StagedFace[] = [];
  for (const file of files) {
    const ext = extFromName(file.name);
    const mime = FONT_EXT_TO_MIME[ext];
    if (!mime) continue; // skip non-font entries silently
    const bytes = new Uint8Array(await file.arrayBuffer());
    const s = await stageFontBytes(bytes, mime, file.name, user.id);
    if (s) staged.push(s);
  }
  if (staged.length === 0) return { ok: false, error: "No valid font files found" };
  return { ok: true, data: staged };
}

/**
 * Extract font files from an uploaded .zip and stage them like uploadFontFiles.
 * Guards against decompression bombs: caps entry count and per-entry size.
 */
export async function importFontZip(formData: FormData): Promise<Result<StagedFace[]>> {
  const user = await requireUser("owner");
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No zip provided" };
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: "Zip is larger than 25MB" };

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { ok: false, error: "Could not read the zip file" };
  }

  const names = Object.keys(entries).filter((n) => FONT_EXT_TO_MIME[extFromName(n)]);
  if (names.length === 0) return { ok: false, error: "No font files in the zip" };
  if (names.length > 128) return { ok: false, error: "Zip has too many font files (max 128)" };

  const staged: StagedFace[] = [];
  for (const name of names) {
    const bytes = entries[name];
    if (bytes.byteLength > 15 * 1024 * 1024) continue; // per-entry cap
    const mime = FONT_EXT_TO_MIME[extFromName(name)]!;
    const base = name.split("/").pop() ?? name;
    const s = await stageFontBytes(bytes, mime, base, user.id);
    if (s) staged.push(s);
  }
  if (staged.length === 0) return { ok: false, error: "No valid fonts extracted" };
  return { ok: true, data: staged };
}

/** Validate + store one font file, parse its metadata. Returns null on failure. */
async function stageFontBytes(
  bytes: Uint8Array,
  mime: string,
  fileName: string,
  userId: string,
): Promise<StagedFace | null> {
  const stored = await storeMediaBytes(bytes, mime, fileName);
  if (!stored.ok) return null;
  await writeAudit({
    userId,
    action: "media.upload",
    ownerType: "media",
    ownerId: stored.row.id,
    meta: { key: stored.row.storageKey, mime, size: stored.row.size, purpose: "font" },
  });
  return {
    mediaId: stored.row.id,
    url: storage.publicUrl(stored.row.storageKey),
    sizeBytes: stored.row.size,
    ext: extFromName(stored.row.storageKey),
    fileName,
    meta: parseFontMeta(bytes),
  };
}

// ── Google Fonts (self-hosted) ────────────────────────────────────────────────

/**
 * Add a Google font: fetch the requested variants' woff2 files server-side,
 * store them as media(kind:"font"), and create a family + its faces. Keeps the
 * fonts self-hosted (no runtime dependency on Google).
 */
export async function addGoogleFont(input: unknown): Promise<Result<FamilyWithFaces>> {
  const user = await requireUser("owner");
  const parsed = googleFontSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }
  const def = googleFontDef(parsed.data.family);
  if (!def) return { ok: false, error: "Unknown Google font" };

  let fetched;
  try {
    fetched = await fetchGoogleFontFaces(parsed.data.family, parsed.data.variants);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fetch failed" };
  }

  // cssStackFor is the family-name safety gate; the stack itself is re-derived
  // at render (fonts/queries.ts), so we don't persist it.
  if (!cssStackFor(def.family)) return { ok: false, error: "Unsafe family name" };

  const [family] = await db
    .insert(fontFamilies)
    .values({ name: def.family, source: "google" })
    .returning();

  // Insert only the faces that actually downloaded + stored, and report those
  // exact faces back — the client must not advertise variants that failed.
  const created: FamilyWithFaces["faces"] = [];
  for (const f of fetched) {
    const stored = await storeMediaBytes(f.bytes, "font/woff2", `${def.family}-${f.weight}-${f.style}.woff2`);
    if (!stored.ok) continue;
    const [faceRow] = await db
      .insert(fontFaces)
      .values({
        familyId: family.id,
        mediaId: stored.row.id,
        weight: f.weight,
        style: f.style,
        displayName: `${f.weight}${f.style === "italic" ? " Italic" : ""}`,
      })
      .returning({ id: fontFaces.id });
    created.push({ id: faceRow.id, weight: f.weight, style: f.style, sizeBytes: stored.row.size, ext: "woff2" });
  }
  updateTag("theme");
  await writeAudit({ userId: user.id, action: "fonts.add-google", ownerType: "font_family", ownerId: family.id, meta: { family: def.family } });
  return {
    ok: true,
    data: { id: family.id, name: family.name, source: "google", status: family.status, faces: created },
  };
}

// ── Family assembly + management ──────────────────────────────────────────────

/** Create a family from already-staged (uploaded) font media rows. */
export async function createFamilyFromFaces(input: unknown): Promise<Result<{ familyId: string }>> {
  const user = await requireUser("owner");
  const parsed = createFamilySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }
  // Name safety gate; the stack is re-derived at render, not persisted.
  if (!cssStackFor(parsed.data.name)) return { ok: false, error: "Unsafe family name" };

  // Every referenced media row must exist and be a font.
  const ids = parsed.data.faces.map((f) => f.mediaId);
  const rows = await db.query.media.findMany({ where: inArray(media.id, ids) });
  const fontIds = new Set(rows.filter((r) => r.kind === "font").map((r) => r.id));
  if (!ids.every((id) => fontIds.has(id))) {
    return { ok: false, error: "One or more font files are missing" };
  }

  const [family] = await db
    .insert(fontFamilies)
    .values({ name: parsed.data.name, source: "custom" })
    .returning();
  for (const face of parsed.data.faces) {
    await db.insert(fontFaces).values({
      familyId: family.id,
      mediaId: face.mediaId,
      weight: face.weight,
      style: face.style,
      displayName: face.displayName,
      unicodeRange: face.unicodeRange,
      isVariable: face.isVariable,
    });
  }
  updateTag("theme");
  await writeAudit({ userId: user.id, action: "fonts.create-family", ownerType: "font_family", ownerId: family.id, meta: { name: parsed.data.name, faces: parsed.data.faces.length } });
  return { ok: true, data: { familyId: family.id } };
}

/** Delete a family and its faces (leaves the underlying media files). If it
 *  was the active theme font, clear that reference so the site cleanly reverts
 *  to the preset instead of pointing at a now-missing family. */
export async function deleteFamily(familyId: string): Promise<Result> {
  const user = await requireUser("owner");
  const fam = await db.query.fontFamilies.findFirst({ where: eq(fontFamilies.id, familyId) });
  if (!fam) return { ok: false, error: "Font family not found" };
  await db.delete(fontFaces).where(eq(fontFaces.familyId, familyId));
  await db.delete(fontFamilies).where(eq(fontFamilies.id, familyId));
  const t = await db.query.theme.findFirst();
  if (t?.fontFamilyId === familyId) {
    await db.update(theme).set({ fontFamilyId: null }).where(eq(theme.id, t.id));
  }
  updateTag("theme");
  await writeAudit({ userId: user.id, action: "fonts.delete-family", ownerType: "font_family", ownerId: familyId });
  return { ok: true };
}

export type FamilyWithFaces = {
  id: string;
  name: string;
  source: "custom" | "google";
  status: "active" | "disabled";
  faces: { id: string; weight: number; style: string; sizeBytes: number; ext: string }[];
};

/** List all families with their faces + file sizes (for the manager + warnings). */
export async function listFontFamilies(): Promise<Result<FamilyWithFaces[]>> {
  await requireUser("owner");
  const families = await db.query.fontFamilies.findMany({ orderBy: [desc(fontFamilies.createdAt)] });
  const faces = await db.query.fontFaces.findMany();
  const mediaRows = await db.query.media.findMany({ where: eq(media.kind, "font") });
  const sizeById = new Map(mediaRows.map((m) => [m.id, { size: m.size, ext: m.storageKey.split(".").pop() ?? "" }]));

  const data: FamilyWithFaces[] = families.map((fam) => ({
    id: fam.id,
    name: fam.name,
    source: fam.source,
    status: fam.status,
    faces: faces
      .filter((f) => f.familyId === fam.id)
      .map((f) => ({
        id: f.id,
        weight: f.weight,
        style: f.style,
        sizeBytes: sizeById.get(f.mediaId)?.size ?? 0,
        ext: sizeById.get(f.mediaId)?.ext ?? "",
      })),
  }));
  return { ok: true, data };
}
