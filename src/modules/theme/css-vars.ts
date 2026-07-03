import { HEX_RE } from "./color-math";
import type { SemanticTokens } from "./derive";

/**
 * Serializes derived tokens to CSS custom properties. Values reaching this
 * file are already derived from zod-validated inputs, but because the output
 * lands in a <style> tag, every value is re-checked against a safe-value
 * pattern here — a value that fails is dropped, never emitted.
 */

const SAFE_VALUE_RE =
  /^[#a-zA-Z0-9(),.\s%\-\/"']+$/;

/** Maps semantic tokens to the full CSS variable vocabulary the design uses. */
export function colorVars(t: SemanticTokens): Record<string, string> {
  return {
    "--bg": t.bg,
    "--surface": t.surface,
    "--surface-hover": t.surfaceHover,
    "--surface-card": t.surfaceCard,
    "--paper-0": t.bg,
    "--paper-1": t.surface,
    "--paper-2": t.surfaceHover,
    "--text": t.text,
    "--text-muted": t.textMuted,
    "--text-faint": t.textFaint,
    "--text-on-accent": t.textOnAccent,
    "--ink-0": t.text,
    "--ink-1": t.textMuted,
    "--ink-2": t.textFaint,
    "--border": t.border,
    "--border-strong": t.borderStrong,
    "--line-0": t.border,
    "--line-1": t.borderStrong,
    "--accent": t.accent,
    "--accent-hover": t.accentHover,
    "--accent-tint": t.accentTint,
    "--maroon": t.accent,
    "--maroon-soft": t.accentHover,
    "--maroon-tint": t.accentTint,
    "--accent-2": t.accent2,
    "--accent-2-hover": t.accent2Hover,
    "--accent-2-tint": t.accent2Tint,
    "--olive": t.accent2,
    "--olive-tint": t.accent2Tint,
    "--solid": t.solid,
    "--solid-hover": t.solidHover,
    "--focus-ring": t.accent,
    "--selection-bg": t.text,
    "--selection-fg": t.bg,
    "--success": t.accent2,
    "--danger": t.accentHover,
  };
}

/** Renders a { --var: value } map as CSS declarations, dropping unsafe values. */
export function declarations(vars: Record<string, string>): string {
  return Object.entries(vars)
    .filter(([k, v]) => k.startsWith("--") && SAFE_VALUE_RE.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** True when every color-looking token is a well-formed hex value. */
export function allHex(vars: Record<string, string>): boolean {
  return Object.values(vars).every((v) => !v.startsWith("#") || HEX_RE.test(v));
}
