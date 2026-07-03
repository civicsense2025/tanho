"use client";

import { deriveTokens, type ThemeBases } from "../derive";
import { contrast } from "../color-math";

/**
 * WCAG contrast panel — checks the 7 fg/bg pairs a theme must keep readable and
 * shows AA/AAA verdicts with live ratios. Pure: it derives tokens from the four
 * base colors client-side (same deriveTokens the render uses), so the editor
 * warns before a low-contrast palette ships. Body-text pairs target AA 4.5:1;
 * large/ui pairs target 3:1.
 */
type Pair = { label: string; fg: keyof ReturnType<typeof deriveTokens>; bg: keyof ReturnType<typeof deriveTokens>; large?: boolean };

const PAIRS: Pair[] = [
  { label: "Body text on background", fg: "text", bg: "bg" },
  { label: "Muted text on background", fg: "textMuted", bg: "bg" },
  { label: "Text on surface card", fg: "text", bg: "surfaceCard" },
  { label: "Text on accent", fg: "textOnAccent", bg: "accent" },
  { label: "Accent on background", fg: "accent", bg: "bg", large: true },
  { label: "Accent 2 on background", fg: "accent2", bg: "bg", large: true },
  { label: "Border on background", fg: "border", bg: "bg", large: true },
];

function verdict(ratio: number, large?: boolean): { label: string; color: string } {
  const aa = large ? 3 : 4.5;
  const aaa = large ? 4.5 : 7;
  if (ratio >= aaa) return { label: "AAA", color: "var(--success)" };
  if (ratio >= aa) return { label: "AA", color: "var(--success)" };
  return { label: "Fail", color: "var(--danger)" };
}

export function ContrastPanel({ bases, mode }: { bases: ThemeBases; mode: "light" | "dark" }) {
  const tokens = deriveTokens(bases, mode);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {PAIRS.map((p) => {
        const ratio = contrast(tokens[p.fg], tokens[p.bg]);
        const v = verdict(ratio, p.large);
        return (
          <div
            key={p.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              fontSize: "var(--text-xs)",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{p.label}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ color: "var(--text-faint)" }}>{ratio.toFixed(2)}:1</span>
              <span style={{ color: v.color, fontWeight: 600 }}>{v.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
