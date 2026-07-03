import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { theme } from "./schema";
import { THEME_DEFAULTS, themeInputSchema, type ThemeInput } from "./validation";

/**
 * Cached theme scalars, re-validated on read so a bad row can never reach
 * the CSS serializer. Revalidated via revalidateTag("theme") on save.
 */
export async function getTheme(): Promise<ThemeInput> {
  "use cache";
  cacheLife("max");
  cacheTag("theme");
  const row = await db.query.theme.findFirst({ where: eq(theme.id, "theme") });
  const parsed = themeInputSchema.safeParse(row);
  return parsed.success ? parsed.data : THEME_DEFAULTS;
}
