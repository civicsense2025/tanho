"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type NavItem = { label: string; href?: string; locked?: boolean };

/**
 * Secondary admin nav bucket — a text label that opens a dropdown of nested
 * destinations, on hover or click (matching the design's AdminNavBucket). A
 * locked bucket (Shop before ecommerce is unlocked) shows a lock and its items
 * route to the unlock flow. `indicator` shows a small dot (Settings while setup
 * is incomplete). Faithful port of AdminScreen.jsx's AdminNavBucket.
 */
export function NavBucket({
  label,
  items,
  indicator,
}: {
  label: string;
  items: NavItem[];
  indicator?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          fontSize: "var(--text-sm)",
          color: open ? "var(--text)" : "var(--text-muted)",
        }}
      >
        {label}
        {indicator ? (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
        ) : null}
        <Chevron open={open} />
      </button>
      {open ? (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, paddingTop: 8 }}>
          <div
            style={{
              minWidth: 190,
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-2)",
            }}
          >
            {items.map((it) => (
              <BucketItem key={it.label} item={it} onNavigate={() => setOpen(false)} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BucketItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const color = item.locked || !item.href ? "var(--text-faint)" : "var(--text)";
  const inner = (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {item.label}
        {item.locked ? <LockGlyph /> : null}
      </span>
      {item.locked ? <Tag>Unlock</Tag> : !item.href ? <Tag>Soon</Tag> : null}
    </span>
  );
  const style = {
    display: "flex",
    width: "100%",
    textAlign: "left" as const,
    padding: "8px 10px",
    borderRadius: "var(--radius-xs)",
    fontSize: "var(--text-sm)",
    color,
  };
  if (!item.href) {
    return <span style={{ ...style, cursor: "default" }}>{inner}</span>;
  }
  return (
    <Link href={item.href} onClick={onNavigate} style={{ ...style, textDecoration: "none" }} className="admin-bucket-item">
      {inner}
    </Link>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-label)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wide)",
        color: "var(--text-faint)",
      }}
    >
      {children}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      style={{
        color: "var(--text-faint)",
        display: "flex",
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform var(--dur) var(--ease)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function LockGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
