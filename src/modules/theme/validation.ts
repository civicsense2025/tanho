import { z } from "zod";
import { HEX_RE } from "./color-math";

const hexColor = z
  .string()
  .regex(HEX_RE, "Must be a hex color like #6e2b32")
  .transform((v) => v.toLowerCase());

/** The editable theme scalars — everything the Brand screen controls. */
export const themeInputSchema = z.object({
  accent: hexColor,
  accent2: hexColor,
  ink: hexColor,
  paper: hexColor,
  font: z.enum(["geist", "system", "serif", "grotesk", "humanist"]),
  baseSize: z.number().min(14).max(20),
  headingScale: z.number().min(0.85).max(1.5),
  leading: z.number().min(1.3).max(2),
  density: z.number().min(0.8).max(1.3),
  radius: z.enum(["square", "soft", "round"]),
  shadow: z.enum(["flat", "subtle", "elevated"]),
  logoMediaId: z.string().nullable().default(null),
  faviconMediaId: z.string().nullable().default(null),
});

export type ThemeInput = z.infer<typeof themeInputSchema>;

/** Neutral default palette — the design system's shipped values. */
export const THEME_DEFAULTS: ThemeInput = themeInputSchema.parse({
  accent: "#6e2b32",
  accent2: "#585c34",
  ink: "#1c1a16",
  paper: "#fdfcf9",
  font: "geist",
  baseSize: 16,
  headingScale: 1,
  leading: 1.6,
  density: 1,
  radius: "soft",
  shadow: "subtle",
});
