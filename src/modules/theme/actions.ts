"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { theme, themePresets } from "./schema";
import { themeInputSchema } from "./validation";
import { importThemeJson } from "./portable";

export type SaveThemeState = { ok?: boolean; error?: string };
export type PresetResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Save the active theme (the singleton `theme` row). Owner-only; the payload
 * must parse against themeInputSchema. Mirrors settings/actions.ts saveSettings
 * — validate, upsert, updateTag("theme") for read-your-own-writes, audit.
 *
 * The active theme is the single source of truth the renderer reads (getTheme →
 * ThemeStyle); named presets (theme_presets) only feed INTO this row on activate.
 */
export async function saveTheme(data: unknown): Promise<SaveThemeState> {
  const user = await requireUser("owner");

  const parsed = themeInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid theme" };
  }

  await db
    .insert(theme)
    .values({ id: "theme", ...parsed.data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: theme.id,
      set: { ...parsed.data, updatedAt: Date.now() },
    });

  updateTag("theme");
  await writeAudit({
    userId: user.id,
    action: "theme.save",
    ownerType: "theme",
    ownerId: "theme",
  });
  return { ok: true };
}

const nameSchema = (v: unknown) =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= 80 ? v.trim() : null;

/** Save the given scalars as a new named preset (does not change the active theme). */
export async function saveAsTheme(name: unknown, data: unknown): Promise<PresetResult> {
  const user = await requireUser("owner");
  const n = nameSchema(name);
  if (!n) return { ok: false, error: "Give the theme a name" };
  const parsed = themeInputSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid theme" };
  const [row] = await db
    .insert(themePresets)
    .values({ name: n, data: parsed.data, source: "local" })
    .returning({ id: themePresets.id });
  updateTag("theme-presets");
  await writeAudit({ userId: user.id, action: "theme.preset.create", ownerType: "theme_preset", ownerId: row!.id });
  return { ok: true, id: row!.id };
}

/** Copy a preset's scalars into the singleton theme row (make it the live theme). */
export async function activateTheme(id: string): Promise<PresetResult> {
  const user = await requireUser("owner");
  const preset = await db.query.themePresets.findFirst({ where: eq(themePresets.id, id) });
  if (!preset) return { ok: false, error: "Theme not found" };
  const parsed = themeInputSchema.safeParse(preset.data);
  if (!parsed.success) return { ok: false, error: "This theme's data is invalid" };
  await db
    .insert(theme)
    .values({ id: "theme", ...parsed.data, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: theme.id, set: { ...parsed.data, updatedAt: Date.now() } });
  updateTag("theme");
  await writeAudit({ userId: user.id, action: "theme.preset.activate", ownerType: "theme_preset", ownerId: id });
  return { ok: true };
}

export async function duplicateTheme(id: string): Promise<PresetResult> {
  await requireUser("owner");
  const preset = await db.query.themePresets.findFirst({ where: eq(themePresets.id, id) });
  if (!preset) return { ok: false, error: "Theme not found" };
  const [row] = await db
    .insert(themePresets)
    .values({ name: `${preset.name} copy`, data: preset.data, source: "local" })
    .returning({ id: themePresets.id });
  updateTag("theme-presets");
  return { ok: true, id: row!.id };
}

export async function renameTheme(id: string, name: unknown): Promise<PresetResult> {
  await requireUser("owner");
  const n = nameSchema(name);
  if (!n) return { ok: false, error: "Give the theme a name" };
  await db.update(themePresets).set({ name: n }).where(eq(themePresets.id, id));
  updateTag("theme-presets");
  return { ok: true };
}

export async function deleteTheme(id: string): Promise<PresetResult> {
  const user = await requireUser("owner");
  const preset = await db.query.themePresets.findFirst({ where: eq(themePresets.id, id) });
  if (!preset) return { ok: false, error: "Theme not found" };
  if (preset.builtin) return { ok: false, error: "Built-in themes can't be deleted" };
  await db.delete(themePresets).where(eq(themePresets.id, id));
  updateTag("theme-presets");
  await writeAudit({ userId: user.id, action: "theme.preset.delete", ownerType: "theme_preset", ownerId: id });
  return { ok: true };
}

/** Validate + store an imported .theme.json (or a library entry) as a preset. */
export async function importTheme(raw: unknown, source: "imported" | "library" = "imported"): Promise<PresetResult> {
  const user = await requireUser("owner");
  const result = importThemeJson(raw);
  if (!result.ok) return { ok: false, error: result.error };
  const [row] = await db
    .insert(themePresets)
    .values({ name: result.name, data: result.theme, source })
    .returning({ id: themePresets.id });
  updateTag("theme-presets");
  await writeAudit({ userId: user.id, action: "theme.preset.import", ownerType: "theme_preset", ownerId: row!.id, meta: { source } });
  return { ok: true, id: row!.id };
}
