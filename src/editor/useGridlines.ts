"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEYS = {
  gridlines: "pb-gridlines",
  baselineGrid: "pb-baseline-grid",
  blockOutlines: "pb-block-outlines",
  rulers: "pb-rulers",
  columns: "pb-grid-columns",
  gridSize: "pb-grid-size",
} as const;

type FlagKey = (typeof KEYS)[keyof typeof KEYS];

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

function readFlag(key: FlagKey): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

function writeFlag(key: FlagKey, value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
  notifyListeners();
}

function readNum(key: FlagKey, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function writeNum(key: FlagKey, value: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
  notifyListeners();
}

export const GRID_SIZE_OPTIONS = [4, 8, 16] as const;
export const COLUMN_OPTIONS = [6, 12, 16] as const;
export const DEFAULT_GRID_SIZE = 8;
export const DEFAULT_COLUMNS = 12;

export type UseGridlinesResult = {
  gridlines: boolean;
  setGridlines: (v: boolean) => void;
  baselineGrid: boolean;
  setBaselineGrid: (v: boolean) => void;
  blockOutlines: boolean;
  setBlockOutlines: (v: boolean) => void;
  rulers: boolean;
  setRulers: (v: boolean) => void;
  columns: number;
  setColumns: (v: number) => void;
  gridSize: number;
  setGridSize: (v: number) => void;
};

/** Local, localStorage-persisted toggles + settings for the gridlines/guides
 *  editing aids. Zustand-independent so it can stay local or be lifted into the
 *  editor store later. Defaults reinforce an 8px grid (the design system's
 *  --space-2). Uses useSyncExternalStore for SSR-safe localStorage reads —
 *  the server snapshot returns defaults (no window), the client snapshot reads
 *  stored preferences, and writes notify all subscribers (including same-tab). */
export function useGridlines(): UseGridlinesResult {
  const gridlines = useSyncExternalStore(
    subscribe,
    () => readFlag(KEYS.gridlines),
    () => false,
  );
  const baselineGrid = useSyncExternalStore(
    subscribe,
    () => readFlag(KEYS.baselineGrid),
    () => false,
  );
  const blockOutlines = useSyncExternalStore(
    subscribe,
    () => readFlag(KEYS.blockOutlines),
    () => false,
  );
  const rulers = useSyncExternalStore(
    subscribe,
    () => readFlag(KEYS.rulers),
    () => false,
  );
  const columns = useSyncExternalStore(
    subscribe,
    () => readNum(KEYS.columns, DEFAULT_COLUMNS),
    () => DEFAULT_COLUMNS,
  );
  const gridSize = useSyncExternalStore(
    subscribe,
    () => readNum(KEYS.gridSize, DEFAULT_GRID_SIZE),
    () => DEFAULT_GRID_SIZE,
  );

  const setGridlines = useCallback((v: boolean) => writeFlag(KEYS.gridlines, v), []);
  const setBaselineGrid = useCallback((v: boolean) => writeFlag(KEYS.baselineGrid, v), []);
  const setBlockOutlines = useCallback((v: boolean) => writeFlag(KEYS.blockOutlines, v), []);
  const setRulers = useCallback((v: boolean) => writeFlag(KEYS.rulers, v), []);
  const setColumns = useCallback((v: number) => writeNum(KEYS.columns, v), []);
  const setGridSize = useCallback((v: number) => writeNum(KEYS.gridSize, v), []);

  return {
    gridlines,
    setGridlines,
    baselineGrid,
    setBaselineGrid,
    blockOutlines,
    setBlockOutlines,
    rulers,
    setRulers,
    columns,
    setColumns,
    gridSize,
    setGridSize,
  };
}
