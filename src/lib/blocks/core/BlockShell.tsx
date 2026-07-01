import type { CSSProperties, ReactNode } from "react";
import { PADDING_SPACE, type StyleProps } from "./style-schema";

/**
 * The single point where a block's StyleProps become real styles. A Server Component (no
 * "use client") so it stays in the public render bundle. Applied centrally by RenderBlock, so
 * individual renderers never need to know about alignment/width/padding/theme — they render
 * their content and BlockShell positions/sizes/themes it. This is the reusability payoff:
 * every block gets consistent, token-safe style controls for free.
 *
 * With no style (the common case, and every legacy block), this renders children directly with
 * NO wrapping element — preserving the exact DOM of pre-style content so nothing regresses.
 * A wrapper appears only once a block actually carries style.
 */
function hasAnyStyle(style?: StyleProps): boolean {
  return !!style && Object.values(style).some((v) => v !== undefined);
}

export function BlockShell({ style, children }: { style?: StyleProps; children: ReactNode }) {
  if (!hasAnyStyle(style)) return <>{children}</>;

  const s: CSSProperties = { containerType: "inline-size" };

  if (style?.align) s.textAlign = style.align;

  if (style?.width === "full-bleed") {
    s.maxWidth = "none";
  } else if (style?.width) {
    s.maxWidth = `var(--width-${style.width})`;
    s.marginInline = "auto";
  }

  if (style?.padding && style.padding !== "none") {
    s.paddingBlock = `var(--space-${PADDING_SPACE[style.padding]})`;
  }

  // Locally swap the accent for this subtree by re-pointing the CSS custom property.
  if (style?.accent === "accent-2") {
    (s as Record<string, string>)["--accent"] = "var(--accent-2)";
    (s as Record<string, string>)["--accent-hover"] = "var(--accent-2-hover)";
    (s as Record<string, string>)["--accent-tint"] = "var(--accent-2-tint)";
  }

  const themeAttr = style?.theme && style.theme !== "inherit" ? style.theme : undefined;

  return (
    <div data-block data-theme={themeAttr} style={s}>
      {children}
    </div>
  );
}
