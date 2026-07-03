import type { ReactNode } from "react";

/**
 * The design's striped media placeholder — shown whenever a media block has
 * no source yet. Shared by image, gallery, video, carousel and embed.
 */
export function MediaPlaceholder({
  label,
  ratio = "16 / 9",
  overlay,
}: {
  label: string;
  ratio?: string;
  overlay?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: ratio,
        width: "100%",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        background:
          "repeating-linear-gradient(45deg, var(--surface), var(--surface) 9px, var(--paper-2) 9px, var(--paper-2) 18px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--text-faint)",
          background: "var(--bg)",
          padding: "3px 8px",
          borderRadius: "var(--radius-xs)",
          border: "1px solid var(--border)",
        }}
      >
        {label}
      </span>
      {overlay}
    </div>
  );
}

/** Shared figcaption style — mono micro-caption under media. */
export const CAPTION_STYLE = {
  marginTop: "var(--space-2)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
  textAlign: "center",
} as const;
