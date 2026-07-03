import { eq } from "drizzle-orm";
import { theme } from "../../src/modules/theme/schema";
import { themeInputSchema } from "../../src/modules/theme/validation";
import { log, type SeedDb } from "../lib";

/**
 * Demo theme — the "Tan Ho" warm-maroon palette. Unlike the neutral seed
 * (which skips if a row exists), the demo overwrites the singleton theme row
 * so `seed:demo` always lands the design's exact scalars on top of whatever
 * the neutral seed left. Re-running is a no-op: it writes the same values.
 */
const DEMO_THEME = themeInputSchema.parse({
  accent: "#6e2b32", // warm maroon
  accent2: "#585c34", // olive
  ink: "#1c1a16",
  paper: "#fdfcf9",
  font: "geist",
  baseSize: 16,
  headingScale: 1.05,
  leading: 1.6,
  density: 1,
  radius: "soft",
  shadow: "subtle",
});

export async function seedDemoTheme(db: SeedDb): Promise<void> {
  const existing = await db.query.theme.findFirst();
  const values = { id: "theme", ...DEMO_THEME, updatedAt: Date.now() };
  if (existing) {
    await db.update(theme).set(values).where(eq(theme.id, "theme"));
  } else {
    await db.insert(theme).values(values);
  }
  log("demo theme applied (warm-maroon palette)");
}
