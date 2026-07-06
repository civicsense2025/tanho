import type { CSSProperties } from "react";
import Link from "next/link";
import type { RenderCtx } from "../types";
import type { LogoContent } from "./fields";
import type { LogoResolved } from "./resolve";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "·";

/**
 * Site logo. An uploaded/linked image (`src`) when set; otherwise the
 * typographic fallback ported from the old LogoMark — initials square + name
 * (mark), name only (wordmark), or square only (icon). The effective name comes
 * from `content.text` or, when empty, the resolver's `siteName` (white-label
 * rule) and is used as the image's alt text. `invert` uses semantic paper/ink
 * tokens (not the old hardcoded hexes) so it theme-tracks on dark surfaces.
 */
export function RenderLogo({
  content,
}: {
  content: LogoContent & { _resolved?: LogoResolved | null };
  ctx: RenderCtx;
}) {
  const resolved = content._resolved;
  const name = content.text || resolved?.siteName || "";
  const homeLink: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-3)",
    textDecoration: "none",
    color: "inherit",
    minWidth: 0,
  };

  // An explicit logo image wins over the typographic mark. Plain <img> (like the
  // image block) — author media has unknown dims/host, so next/image isn't used;
  // height-capped with width:auto keeps the aspect ratio in the bar.
  if (content.src) {
    return (
      <Link href="/" aria-label={name || "Home"} style={homeLink}>
        {/* eslint-disable-next-line @next/next/no-img-element -- author logo of unknown dims/host; next/image needs sizing + remotePatterns */}
        <img
          src={content.src}
          alt={name || "Home"}
          style={{
            height: content.big ? 40 : 28,
            width: "auto",
            maxWidth: "100%",
            display: "block",
            objectFit: "contain",
          }}
        />
      </Link>
    );
  }
  const square: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    flex: "0 0 auto",
    background: content.invert ? "var(--paper-0)" : "var(--solid)",
    color: content.invert ? "var(--ink-0)" : "var(--text-on-accent)",
    borderRadius: "var(--radius-xs)",
    fontFamily: "var(--font-label)",
    fontSize: "var(--text-2xs)",
    letterSpacing: "var(--tracking-wide)",
  };
  return (
    <Link href="/" aria-label={name || "Home"} style={homeLink}>
      {content.style !== "wordmark" ? (
        <span aria-hidden style={square}>
          {content.style === "icon" && content.icon ? content.icon : initialsOf(name)}
        </span>
      ) : null}
      {content.style !== "icon" ? (
        <span
          style={{
            fontSize: content.big ? "var(--text-h2)" : "var(--text-sm)",
            fontWeight: "var(--weight-medium)" as never,
            letterSpacing: content.big ? "var(--tracking-tight)" : undefined,
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
