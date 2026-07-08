"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

const LOCAL_KEY = "visitor-mode";
const EVENT = "visitor-mode-change";

type Mode = "light" | "dark" | "system";

function getSnapshot(): string {
  return localStorage.getItem(LOCAL_KEY) ?? "system";
}

function getServerSnapshot(): string {
  return "system";
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function resolveDom(mode: Mode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

/**
 * A compact three-way theme toggle for the public site: light, dark, or system
 * (follow OS). Persists the choice in localStorage and sets `data-theme` on
 * <html> immediately on click for instant feedback. The server renders the
 * site default (from appearance settings) on <html>; this component overrides
 * it at hydration via useLayoutEffect, so a returning visitor with a saved
 * preference may see a brief flash of the site default before it corrects.
 *
 * Uses useSyncExternalStore for SSR-safe localStorage reads (no setState-in-
 * effect, no hydration mismatch — the server snapshot is always "system" and
 * the client snapshot resolves after mount).
 */
export function VisitorThemeToggle({ className }: { className?: string }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode: Mode = raw === "light" || raw === "dark" || raw === "system" ? raw : "system";

  // Sync the DOM data-theme attribute from the store value. useLayoutEffect
  // runs before paint so there's no flash.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolveDom(mode);
  }, [mode]);

  const apply = useCallback((next: Mode) => {
    localStorage.setItem(LOCAL_KEY, next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const btn = (m: Mode, label: string, glyph: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      aria-label={label}
      title={label}
      onClick={() => apply(m)}
      className={className}
      style={{
        background: mode === m ? "var(--accent)" : "transparent",
        color: mode === m ? "var(--text-on-accent)" : "var(--text-muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-1) var(--space-2)",
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-0-5)",
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Theme"
      style={{ display: "inline-flex", gap: "var(--space-0-5)" }}
    >
      {btn("light", "Light", "☀")}
      {btn("dark", "Dark", "☾")}
      {btn("system", "System", "⚙")}
    </div>
  );
}
