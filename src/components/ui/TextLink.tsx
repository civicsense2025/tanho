"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";

/** TextLink — inline text link; hairline underline warms to maroon on hover.
 *  `arrow` adds a directional glyph ("← Back" / "Edit →" / "Live ↗"). */
export function TextLink({
  children,
  href = "#",
  arrow,
  muted = false,
  style,
  ...props
}: {
  children: ReactNode;
  href?: string;
  arrow?: "back" | "forward" | "external";
  muted?: boolean;
  style?: CSSProperties;
} & Omit<React.ComponentProps<typeof Link>, "href" | "style">) {
  const [hover, setHover] = useState(false);
  const glyph = arrow === "back" ? "← " : "";
  const trail = arrow === "external" ? " ↗" : arrow === "forward" ? " →" : "";

  const merged: CSSProperties = {
    color: muted ? "var(--text-muted)" : "var(--text)",
    textDecoration: arrow ? "none" : "underline",
    textUnderlineOffset: "3px",
    textDecorationColor: hover ? "var(--accent)" : "var(--border-strong)",
    transition: "var(--transition)",
    cursor: "pointer",
    ...(arrow ? { color: hover ? "var(--text)" : "var(--text-muted)" } : {}),
    ...style,
  };

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={merged}
      {...props}
    >
      {glyph}
      {children}
      {trail}
    </Link>
  );
}
