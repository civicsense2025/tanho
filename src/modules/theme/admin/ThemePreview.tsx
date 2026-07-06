"use client";

import { themeScopeStyle } from "../scope-style";
import type { ThemeInput } from "../validation";

/**
 * Live theme preview — a representative slice of UI (heading, text, buttons,
 * a card, an accent chip) rendered inside a scope whose CSS vars come from the
 * IN-EDITOR theme, not the saved one. Uses the same derive pipeline as the
 * real ThemeStyle (via themeScopeStyle), so what you see is what ships.
 * `mode` flips light/dark.
 */
export function ThemePreview({ theme, mode }: { theme: ThemeInput; mode: "light" | "dark" }) {
  const style = themeScopeStyle(theme, mode);

  return (
    <div
      style={{
        ...style,
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "var(--text-h2)", lineHeight: "var(--leading-normal)" }}>
        The quick brown fox
      </h3>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-body)" }}>
        Body copy in the muted tone. Everything here restyles from your four base
        colors and the type &amp; spacing scales — no per-block edits.
      </p>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <span
          style={{
            background: "var(--accent)",
            color: "var(--text-on-accent)",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-sm)",
          }}
        >
          Primary
        </span>
        <span
          style={{
            background: "var(--accent-tint)",
            color: "var(--accent)",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-sm)",
          }}
        >
          Accent tint
        </span>
        <span
          style={{
            border: "1px solid var(--border-strong)",
            color: "var(--text)",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-sm)",
          }}
        >
          Outline
        </span>
      </div>
      <div
        style={{
          background: "var(--surface-card)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-4)",
          boxShadow: "var(--shadow-md)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
        }}
      >
        A surface card with the accent-2 chip:{" "}
        <span style={{ color: "var(--accent-2)" }}>● secondary</span>
      </div>
    </div>
  );
}
