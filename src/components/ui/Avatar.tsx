import type { CSSProperties } from "react";

/** Avatar — circular (or square) image; falls back to monogram initials. */
export function Avatar({
  src,
  alt = "",
  name = "",
  size = 64,
  rounded = "full",
  style,
}: {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: number;
  rounded?: "full" | "square";
  style?: CSSProperties;
}) {
  const radius = rounded === "full" ? "var(--radius-pill)" : "var(--radius-sm)";
  const box: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    objectFit: "cover",
    display: "inline-flex",
    ...style,
  };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt || name} style={box} />;
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      style={{
        ...box,
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-label)",
        fontSize: Math.max(11, size * 0.32),
        letterSpacing: "0.02em",
        border: "1px solid var(--border)",
      }}
    >
      {initials || "—"}
    </span>
  );
}
