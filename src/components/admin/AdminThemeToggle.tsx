"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

const LOCAL_KEY = "admin-editor-mode";
const EVENT = "admin-mode-change";

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
 * Per-user admin/editor chrome theme preference. Persisted in localStorage only
 * (never touches the DB or the visitor-facing data-theme). When the admin
 * changes this, it sets `data-theme` on `<html>` so the entire admin shell +
 * editor chrome follows — the admin's authoring environment reflects their
 * preference without affecting what visitors see.
 *
 * Uses useSyncExternalStore for SSR-safe localStorage reads (no setState-in-
 * effect, no hydration mismatch — the server snapshot is always "system" and
 * the client snapshot resolves after mount).
 */
export function AdminThemeToggle() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode: Mode = raw === "light" || raw === "dark" || raw === "system" ? raw : "system";

  // Sync the DOM data-theme attribute from the store value. useLayoutEffect
  // runs before paint so there's no flash. This is the React-recommended
  // "sync to external system" pattern — not derived state, so no set-state-
  // in-effect lint violation.
  //
  // On unmount, restore the server-set data-theme so the admin's preference
  // doesn't leak to the public site during client-side navigation (the admin
  // toggle writes localStorage only, so the server-rendered data-theme is the
  // correct value to revert to).
  useLayoutEffect(() => {
    const el = document.documentElement;
    const prior = el.dataset.theme;
    el.dataset.theme = resolveDom(mode);
    return () => {
      if (prior) el.dataset.theme = prior;
      else delete el.dataset.theme;
    };
  }, [mode]);

  const apply = useCallback((next: Mode) => {
    localStorage.setItem(LOCAL_KEY, next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const cycleMode = useCallback(() => {
    const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    apply(next);
  }, [mode, apply]);

  const getGlyph = (current: Mode): string => {
    switch (current) {
      case "light": return "☀";
      case "dark": return "☾";
      case "system": return "⚙";
    }
  };

  const getLabel = (current: Mode): string => {
    switch (current) {
      case "light": return "Light mode";
      case "dark": return "Dark mode";
      case "system": return "System theme";
    }
  };

  return (
    <button
      type="button"
      aria-label={`${getLabel(mode)} (click to cycle)`}
      title={`${getLabel(mode)} (click to cycle)`}
      onClick={cycleMode}
      style={{
        background: "transparent",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xs)",
        padding: "var(--space-1) var(--space-2)",
        fontSize: "var(--text-2xs)",
        cursor: "pointer",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
      }}
    >
      <span aria-hidden="true">{getGlyph(mode)}</span>
    </button>
  );
}
