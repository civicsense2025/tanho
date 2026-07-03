import Link from "next/link";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "·";

/**
 * Site logo — initials-in-ink-square + name (mark), name only (wordmark),
 * or square only (icon). `name` is already the effective site name (config
 * text falls back to general settings upstream). `invert` flips the square
 * for the dark footer variants.
 */
export function LogoMark({
  name,
  logoStyle = "mark",
  icon = "",
  big = false,
  invert = false,
}: {
  name: string;
  logoStyle?: "mark" | "wordmark" | "icon";
  icon?: string;
  big?: boolean;
  invert?: boolean;
}) {
  const square: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    flex: "0 0 auto",
    background: invert ? "#f0ede4" : "var(--solid)",
    color: invert ? "#14130f" : "var(--text-on-accent)",
    borderRadius: "var(--radius-xs)",
    fontFamily: "var(--font-label)",
    fontSize: "var(--text-2xs)",
    letterSpacing: "var(--tracking-wide)",
  };
  return (
    <Link
      href="/"
      aria-label={name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-3)",
        textDecoration: "none",
        color: "inherit",
        minWidth: 0,
      }}
    >
      {logoStyle !== "wordmark" ? (
        <span aria-hidden style={square}>
          {logoStyle === "icon" && icon ? icon : initialsOf(name)}
        </span>
      ) : null}
      {logoStyle !== "icon" ? (
        <span
          style={{
            fontSize: big ? "var(--text-h2)" : "var(--text-sm)",
            fontWeight: "var(--weight-medium)" as never,
            letterSpacing: big ? "var(--tracking-tight)" : undefined,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
      ) : null}
    </Link>
  );
}
