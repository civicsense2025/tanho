"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag } from "./Tag";

/** ProjectRow — the home page's selected-work list item. Logo/monogram,
 *  title, year, tagline, tags, and a reveal-on-hover arrow. */
export function ProjectRow({
  title,
  year,
  tagline,
  logo,
  tags = [],
  href,
}: {
  title: string;
  year?: number | string | null;
  tagline?: string | null;
  logo?: string | null;
  tags?: string[];
  href: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)",
        padding: "var(--space-5) var(--space-4)",
        margin: "0 calc(-1 * var(--space-4))",
        borderRadius: "var(--radius-sm)",
        borderBottom: "1px solid var(--border)",
        textDecoration: "none",
        background: hover ? "var(--surface-hover)" : "transparent",
        transition: "var(--transition)",
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            objectFit: "contain",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: hover ? "var(--accent)" : "var(--text-faint)",
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-body)",
            letterSpacing: "0.02em",
            transition: "var(--transition)",
          }}
        >
          {(title || "").trim().charAt(0).toUpperCase() || "—"}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "3px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "var(--text-body)",
              fontWeight: 500,
              color: hover ? "var(--accent)" : "var(--text)",
              transition: "var(--transition)",
            }}
          >
            {title}
          </h3>
          {year && (
            <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
              {year}
            </span>
          )}
        </div>
        {tagline && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              lineHeight: "var(--leading-snug)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tagline}
          </p>
        )}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </div>
      <span
        style={{
          flexShrink: 0,
          color: "var(--text-muted)",
          fontSize: "var(--text-sm)",
          opacity: hover ? 1 : 0,
          transform: hover ? "translateX(0)" : "translateX(-4px)",
          transition: "var(--transition), transform var(--dur) var(--ease)",
        }}
      >
        →
      </span>
    </Link>
  );
}
