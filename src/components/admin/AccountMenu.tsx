"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/modules/auth/actions";

/**
 * Account menu — one home for site settings, account/profile, and log out
 * (faithful port of AdminScreen.jsx's AccountMenu, which consolidated the
 * duplicate entry points the design flagged). A pill with the user's initials
 * opens a dropdown: identity block (name + role badge + email), then the links.
 * This is the ONLY place site/brand identity lives in the top bar.
 */
export function AccountMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Account"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 8px 3px 3px",
          border: `1px solid ${open ? "var(--text-muted)" : "var(--border)"}`,
          borderRadius: "var(--radius-pill)",
          background: "var(--surface-card)",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--maroon-tint)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-label)",
            fontSize: 9,
            fontWeight: 500,
          }}
        >
          {initials}
        </span>
        <span style={{ color: "var(--text-faint)", display: "flex", transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dur) var(--ease)" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 50,
            minWidth: 236,
            background: "var(--surface-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--solid)",
                color: "var(--text-on-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-label)",
                fontSize: 9,
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {initials}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{name}</span>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "var(--text-2xs)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    color: "var(--accent)",
                    background: "var(--maroon-tint)",
                    borderRadius: "var(--radius-pill)",
                    padding: "1px 7px",
                  }}
                >
                  {role}
                </span>
              </span>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", marginTop: 2 }}>
                {email}
              </span>
            </span>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <MenuLink href="/admin/settings" onClick={() => setOpen(false)}>Site settings</MenuLink>
          <MenuLink href="/admin/settings/general" onClick={() => setOpen(false)}>Account &amp; profile</MenuLink>
          <MenuLink href="/admin/marketplace/browse" onClick={() => setOpen(false)}>Marketplace</MenuLink>
          <form action={logoutAction}>
            <button type="submit" style={menuItemStyle("var(--danger)")}>Log out</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

const menuItemStyle = (color: string) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left" as const,
  padding: "8px 10px",
  border: "none",
  background: "none",
  cursor: "pointer",
  borderRadius: "var(--radius-xs)",
  fontSize: "var(--text-sm)",
  color,
});

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} style={{ ...menuItemStyle("var(--text)"), textDecoration: "none" }}>
      {children}
    </Link>
  );
}
