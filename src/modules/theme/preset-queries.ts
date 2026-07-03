import { cacheLife, cacheTag } from "next/cache";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { themePresets } from "./schema";
import { themeInputSchema, type ThemeInput } from "./validation";

export type ThemePresetRow = {
  id: string;
  name: string;
  data: ThemeInput;
  source: "local" | "imported" | "library";
  builtin: boolean;
  createdAt: number;
};

/**
 * All saved themes, built-ins first then newest. Cached on "theme-presets";
 * mutations updateTag it. Rows whose stored data no longer validates are
 * dropped rather than surfaced (fail-closed).
 */
export async function listThemePresets(): Promise<ThemePresetRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag("theme-presets");
  const rows = await db.query.themePresets.findMany({
    orderBy: [desc(themePresets.builtin), desc(themePresets.createdAt)],
  });
  return rows.flatMap((r) => {
    const parsed = themeInputSchema.safeParse(r.data);
    if (!parsed.success) return [];
    return [{ id: r.id, name: r.name, data: parsed.data, source: r.source, builtin: r.builtin, createdAt: r.createdAt }];
  });
}
