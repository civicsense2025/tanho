import type { CSSProperties, ReactNode } from "react";

type Status = "neutral" | "published" | "draft" | "danger";

const map: Record<Status, { color: string; dot: string }> = {
  neutral: { color: "var(--text-muted)", dot: "var(--text-faint)" },
  published: { color: "var(--accent-2)", dot: "var(--accent-2)" },
  draft: { color: "var(--text-faint)", dot: "var(--border-strong)" },
  danger: { color: "var(--accent)", dot: "var(--accent)" },
};

/** Badge — status indicator (draft / published) with a soft dot. */
export function Badge({
  children,
  status = "neutral",
  dot = true,
  style,
}: {
  children: ReactNode;
  status?: Status;
  dot?: boolean;
  style?: CSSProperties;
}) {
  const c = map[status] ?? map.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-label)",
        fontSize: "var(--text-2xs)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wide)",
        lineHeight: 1,
        color: c.color,
        ...style,
      }}
    >
      {dot && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: c.dot, flexShrink: 0 }} />}
      {children}
    </span>
  );
}
