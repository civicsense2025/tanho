import { themeInputSchema, type ThemeInput } from "./validation";

/**
 * Portable theme format — the unit a user exports, shares, or imports, and the
 * shape entries in the theme library use. It carries only the ~12 scalars, so
 * it's tiny and deployment-agnostic (no derived colors, no media, no ids).
 */
export const THEME_FORMAT = "oys-theme@1";

export type PortableTheme = {
  format: typeof THEME_FORMAT;
  name: string;
  theme: ThemeInput;
  generatedAt?: number;
};

/** Serialize the current scalars to a portable object (for a .theme.json). */
export function exportThemeJson(name: string, theme: ThemeInput, now: number): PortableTheme {
  return {
    format: THEME_FORMAT,
    name: name.trim() || "Untitled theme",
    theme: themeInputSchema.parse(theme),
    generatedAt: now,
  };
}

export type ImportResult =
  | { ok: true; name: string; theme: ThemeInput }
  | { ok: false; error: string };

/**
 * Validate an imported .theme.json. Checks the format tag and that the payload
 * parses against themeInputSchema (fail-closed — a malformed or wrong-version
 * file is rejected, never partially applied).
 */
export function importThemeJson(raw: unknown): ImportResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a theme file" };
  const obj = raw as Record<string, unknown>;
  if (obj.format !== THEME_FORMAT) {
    return { ok: false, error: `Unsupported theme format (expected ${THEME_FORMAT})` };
  }
  const parsed = themeInputSchema.safeParse(obj.theme);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid theme values" };
  }
  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "Imported theme";
  return { ok: true, name: name.slice(0, 80), theme: parsed.data };
}
