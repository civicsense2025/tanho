import type { CSSProperties } from "react";

/** Sweet-spot / max character guidance (Google truncates roughly around these lengths on
 * desktop). Green = comfortably inside the sweet spot, amber = past it but not yet truncated,
 * red = past the practical max and will likely get cut off in search results. */
const TITLE_SWEET_SPOT = 60;
const TITLE_MAX = 70;
const DESCRIPTION_SWEET_SPOT = 160;
const DESCRIPTION_MAX = 175;

function counterColor(length: number, sweetSpot: number, max: number): string {
  if (length === 0 || length <= sweetSpot) return "#5f7a3d"; // green
  if (length <= max) return "#a5760a"; // amber
  return "#a5342f"; // red
}

function CharCounter({ length, sweetSpot, max }: { length: number; sweetSpot: number; max: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-label)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "var(--tracking-wide)",
        color: counterColor(length, sweetSpot, max),
      }}
    >
      {length} / {sweetSpot}
    </span>
  );
}

/** Visual Google-style SERP mockup. Takes already-resolved (template-substituted) title/description
 * strings -- this component does no substitution of its own, it's purely presentational. */
export function SerpPreview({
  title,
  description,
  url,
  style,
}: {
  title: string;
  description: string;
  url: string;
  style?: CSSProperties;
}) {
  const displayTitle = title || "Untitled";
  const displayDescription = description || "No description set.";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "var(--space-4)",
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontFamily: "arial, sans-serif",
        ...style,
      }}
    >
      <div style={{ fontSize: "14px", color: "#202124", lineHeight: 1.3 }}>{url}</div>
      <div style={{ fontSize: "20px", lineHeight: 1.3, color: "#1a0dab", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {displayTitle}
      </div>
      <div style={{ fontSize: "14px", lineHeight: 1.55, color: "#4d5156" }}>{displayDescription}</div>

      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid var(--border)" }}>
        <CharCounter length={title.length} sweetSpot={TITLE_SWEET_SPOT} max={TITLE_MAX} />
        <CharCounter length={description.length} sweetSpot={DESCRIPTION_SWEET_SPOT} max={DESCRIPTION_MAX} />
      </div>
    </div>
  );
}
