import type { CSSProperties, ReactNode } from "react";

type Tone = "neutral" | "olive" | "maroon";

const tones: Record<Tone, CSSProperties> = {
  neutral: { color: "var(--text-muted)", borderColor: "var(--border)", background: "transparent" },
  olive: { color: "var(--accent-2)", borderColor: "transparent", background: "var(--accent-2-tint)" },
  maroon: { color: "var(--accent)", borderColor: "transparent", background: "var(--accent-tint)" },
};

/** Tag — small pill label for project categories. Uppercase mono, hairline border. */
export function Tag({ children, tone = "neutral", style }: { children: ReactNode; tone?: Tone; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-label)",
        fontSize: "var(--text-2xs)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wide)",
        lineHeight: 1,
        padding: "4px 9px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid",
        whiteSpace: "nowrap",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
