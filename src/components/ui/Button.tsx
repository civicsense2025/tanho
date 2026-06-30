"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

type Variant = "solid" | "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, CSSProperties> = {
  sm: { fontSize: "var(--text-2xs)", padding: "6px 12px" },
  md: { fontSize: "var(--text-xs)", padding: "9px 18px" },
  lg: { fontSize: "var(--text-sm)", padding: "11px 24px" },
};

const variants: Record<Variant, { background: string; color: string; borderColor: string }> = {
  solid: { background: "var(--solid)", color: "var(--text-on-accent)", borderColor: "var(--solid)" },
  accent: { background: "var(--accent)", color: "var(--text-on-accent)", borderColor: "var(--accent)" },
  outline: { background: "transparent", color: "var(--text)", borderColor: "var(--border)" },
  ghost: { background: "transparent", color: "var(--text-muted)", borderColor: "transparent" },
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  uppercase?: boolean;
  style?: CSSProperties;
};

type AsButton = CommonProps & { as?: "button" } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;
type AsAnchor = CommonProps & { as: "a" } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps>;

/** Button — solid / accent / outline / ghost. Restrained, hairline outline. */
export function Button(props: AsButton | AsAnchor) {
  const { children, variant = "solid", size = "md", uppercase, style, ...rest } = props;
  const [hover, setHover] = useState(false);
  const isUpper = uppercase ?? variant === "outline";
  const v = variants[variant];

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5em",
    fontFamily: isUpper ? "var(--font-label)" : "var(--font-sans)",
    fontWeight: isUpper ? 400 : 500,
    textTransform: isUpper ? "uppercase" : "none",
    letterSpacing: isUpper ? "var(--tracking-wide)" : "0",
    lineHeight: 1,
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "var(--transition)",
    border: "1px solid transparent",
    ...sizes[size],
    background: v.background,
    color: v.color,
    borderColor: v.borderColor,
  };

  const hoverStyle: CSSProperties = !hover
    ? {}
    : variant === "solid"
      ? { background: "var(--solid-hover)" }
      : variant === "accent"
        ? { background: "var(--accent-hover)" }
        : variant === "outline"
          ? { borderColor: "var(--text-muted)" }
          : { color: "var(--text)" };

  const merged: CSSProperties = { ...base, ...hoverStyle, ...style };
  const handlers = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };

  if (rest.as === "a") {
    const { as: _as, ...anchorProps } = rest;
    void _as;
    return (
      <a style={merged} {...handlers} {...(anchorProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  const { as: _as, ...buttonProps } = rest as { as?: "button" } & React.ButtonHTMLAttributes<HTMLButtonElement>;
  void _as;
  return (
    <button style={merged} {...handlers} {...buttonProps}>
      {children}
    </button>
  );
}
