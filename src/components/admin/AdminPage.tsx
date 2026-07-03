import type { CSSProperties, ReactNode } from "react";

/**
 * Shared admin content column. Every admin screen wraps its body in this so the
 * content edge lines up with the chrome (the design's convention: a centered
 * `--width-prose` column). A few screens that are genuinely two-column or
 * full-canvas opt into `width="wide"` / `width="canvas"`.
 */
const WIDTHS: Record<string, string> = {
  prose: "var(--width-prose)", // 48rem — the default, matches the top bar
  wide: "72rem", // two-column editors (Brand)
  canvas: "1400px", // full page-builder canvas
};

export function AdminPage({
  children,
  width = "prose",
  style,
}: {
  children: ReactNode;
  width?: "prose" | "wide" | "canvas";
  style?: CSSProperties;
}) {
  return (
    <main
      style={{
        maxWidth: WIDTHS[width],
        margin: "0 auto",
        padding: "var(--space-8) var(--gutter) var(--space-12)",
        ...style,
      }}
    >
      {children}
    </main>
  );
}
