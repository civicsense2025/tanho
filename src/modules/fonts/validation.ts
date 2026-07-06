import { z } from "zod";

/**
 * The ONE allowlist for font-family names — letters, numbers, spaces, hyphens.
 * Security-relevant: family names are emitted (quoted) into a server-rendered
 * `<style>` tag, so this is the single source of truth for what may get there.
 * css.ts imports it for its emit-time re-check; do not re-declare it elsewhere.
 */
export const FAMILY_NAME_RE = /^[a-zA-Z0-9 -]+$/;

export const familyNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(FAMILY_NAME_RE, "Letters, numbers, spaces and hyphens only");

export const fontWeightSchema = z.number().int().min(1).max(1000);
export const fontStyleSchema = z.enum(["normal", "italic"]);

/** One face the client asks to create from an already-uploaded media row. */
export const faceInputSchema = z.object({
  mediaId: z.string().min(1).max(64),
  weight: fontWeightSchema.default(400),
  style: fontStyleSchema.default("normal"),
  displayName: z.string().max(60).default(""),
  unicodeRange: z
    .string()
    .max(300)
    .regex(/^$|^[uU+0-9a-fA-F,\s-]+$/, "Invalid unicode-range")
    .default(""),
  isVariable: z.boolean().default(false),
});
export type FaceInput = z.infer<typeof faceInputSchema>;

/** Create a family from a set of already-uploaded faces. */
export const createFamilySchema = z.object({
  name: familyNameSchema,
  faces: z.array(faceInputSchema).min(1).max(24),
});
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;

/** Add a Google font: family name + which weights/styles to self-host. */
export const googleFontSchema = z.object({
  family: familyNameSchema,
  variants: z
    .array(z.object({ weight: fontWeightSchema, style: fontStyleSchema }))
    .min(1)
    .max(18),
});
export type GoogleFontInput = z.infer<typeof googleFontSchema>;

/**
 * Page-speed warning thresholds. Grounded in web-font performance guidance
 * (web.dev "Best practices for fonts"; Lighthouse font audits) plus sensible
 * engineering defaults. Deliberately conservative and easy to tune; warnings
 * are advisory, never blocking.
 */
export const FONT_PERF = {
  /** Total active font payload above this is flagged (KB). */
  payloadWarnKb: 300,
  /** More than this many active families hurts consistency + performance. */
  maxFamilies: 2,
  /** More than this many total faces across all families is flagged. */
  maxFaces: 6,
  /** woff2 is ~30% smaller and avoids FOIT; non-woff2 faces are flagged. */
  preferWoff2: true,
} as const;

export type FontPerfWarning = {
  level: "warn" | "info";
  code: "payload" | "families" | "faces" | "non-woff2";
  message: string;
};

/**
 * Pure advisory check over the active font set. `faces` carries the minimum
 * needed to judge cost. Kept here (not in a component) so it can be unit-tested.
 */
export function fontPerfWarnings(input: {
  familyCount: number;
  faces: { ext: string; sizeBytes: number }[];
}): FontPerfWarning[] {
  const warnings: FontPerfWarning[] = [];
  const totalKb = Math.round(
    input.faces.reduce((sum, f) => sum + f.sizeBytes, 0) / 1024,
  );

  if (totalKb > FONT_PERF.payloadWarnKb) {
    warnings.push({
      level: "warn",
      code: "payload",
      message: `Fonts add ~${totalKb} KB (over ${FONT_PERF.payloadWarnKb} KB). Drop unused weights or subset to speed up first paint.`,
    });
  }
  if (input.familyCount > FONT_PERF.maxFamilies) {
    warnings.push({
      level: "warn",
      code: "families",
      message: `${input.familyCount} font families active. Using at most ${FONT_PERF.maxFamilies} loads faster and looks more consistent.`,
    });
  }
  if (input.faces.length > FONT_PERF.maxFaces) {
    warnings.push({
      level: "info",
      code: "faces",
      message: `${input.faces.length} font files will load. Each weight/style is a separate download — keep only the ones you use.`,
    });
  }
  const nonWoff2 = input.faces.filter((f) => f.ext.toLowerCase() !== "woff2").length;
  if (FONT_PERF.preferWoff2 && nonWoff2 > 0) {
    warnings.push({
      level: "info",
      code: "non-woff2",
      message: `${nonWoff2} font file(s) aren't woff2. Converting to woff2 cuts ~30% off their size and avoids invisible text while loading.`,
    });
  }
  return warnings;
}
