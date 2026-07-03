import { eq } from "drizzle-orm";
import { theme, themePresets } from "../../src/modules/theme/schema";
import { THEME_DEFAULTS, themeInputSchema } from "../../src/modules/theme/validation";
import { log, type SeedDb } from "../lib";

/** A few built-in starter themes every install ships with (activate to apply). */
const BUILTIN_PRESETS: Array<{ name: string; data: unknown }> = [
  { name: "Warm clay (default)", data: THEME_DEFAULTS },
  { name: "Midnight", data: { accent: "#6d7cff", accent2: "#37d3a6", ink: "#e7e9f5", paper: "#0f1220", font: "grotesk", baseSize: 16, headingScale: 1.1, leading: 1.6, density: 1, radius: "soft", shadow: "subtle" } },
  { name: "Harbor", data: { accent: "#2f5d7c", accent2: "#0e8a8a", ink: "#12212b", paper: "#ffffff", font: "geist", baseSize: 16, headingScale: 1.05, leading: 1.6, density: 1, radius: "soft", shadow: "subtle" } },
  { name: "Meadow", data: { accent: "#2f6b3f", accent2: "#b0742a", ink: "#161a15", paper: "#fbfdf9", font: "humanist", baseSize: 16, headingScale: 1.1, leading: 1.65, density: 1, radius: "soft", shadow: "subtle" } },
];

/** Default palette = the design system's shipped warm-maroon theme. */
export async function seedTheme(db: SeedDb) {
  await db
    .insert(theme)
    .values({ id: "theme", ...THEME_DEFAULTS })
    .onConflictDoNothing();

  // Built-in presets — idempotent by name, so re-seeding never duplicates.
  for (const p of BUILTIN_PRESETS) {
    const existing = await db.query.themePresets.findFirst({ where: eq(themePresets.name, p.name) });
    if (existing) continue;
    await db.insert(themePresets).values({ name: p.name, data: themeInputSchema.parse(p.data), source: "library", builtin: true });
  }
  log("theme + built-in presets seeded (skip if present)");
}
