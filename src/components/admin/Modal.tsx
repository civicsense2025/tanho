"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Minimal modal overlay — no dependency, matches the codebase's plain-CSS/
 * inline-style convention. Closes on Escape or backdrop click. Portals to
 * document.body so it isn't clipped by any ancestor's overflow/stacking
 * context (e.g. the settings AdminPage column).
 */
export function Modal({
  onClose,
  children,
  width = 960,
}: {
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "var(--space-8) var(--gutter)",
        overflowY: "auto",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
