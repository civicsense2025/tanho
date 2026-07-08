"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type ChangeKind = "text" | "structural";

export interface UseAutosaveOptions<T> {
  /** The save function — receives the latest data, returns ok/error. */
  save: (data: T) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Debounce for content edits like text typing (default 2000ms). */
  debounceTextMs?: number;
  /** Debounce for structural changes like insert/move/delete (default 400ms). */
  debounceStructMs?: number;
  /** Max retries before surfacing error to the user (default 3). */
  maxRetries?: number;
}

export interface UseAutosaveResult<T> {
  /** Current save state for UI display. */
  saveState: SaveState;
  /** Error message if saveState === "error"; null otherwise. */
  errorMessage: string | null;
  /** Push new data to the autosave queue. Kind controls the debounce delay. */
  schedule: (data: T, kind?: ChangeKind) => void;
  /** Flush any pending save immediately. Returns true if save succeeded or
   *  nothing was pending. Used by Publish to ensure draft is persisted first. */
  flush: () => Promise<boolean>;
  /** Cancel any pending debounce timer and reset retry state. Called on unmount. */
  cancel: () => void;
  /** Reset the diff baseline to the given data so the next `schedule` with
   *  different data is detected as a change. Call after loading fresh data
   *  (e.g. in the init effect) so the initial state isn't seen as "unsaved". */
  resetBaseline: (data: T) => void;
}

const DEFAULT_TEXT_MS = 2000;
const DEFAULT_STRUCT_MS = 400;
const DEFAULT_MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

/**
 * Intelligent autosave hook — replaces the duplicated debounce-save pattern
 * across PageEditor, BlockCanvasEditor, and ChromeEditor with one shared
 * implementation that adds four safeguards the old inline timers lacked:
 *
 * 1. **Client-side diff gate**: serializes the data and compares to the last
 *    successfully saved snapshot. If identical, the server call is skipped
 *    entirely — zero DB writes for no-op changes (e.g. selection-only updates
 *    that re-emit the same tree, or an edit followed by its undo).
 *
 * 2. **In-flight coalescing**: if a save is already in progress when the
 *    debounce fires, the latest data is queued and flushed when the current
 *    save completes — never two concurrent saves to the same row.
 *
 * 3. **Retry with backoff**: on failure, retries up to `maxRetries` times
 *    (1s → 2s → 4s) before surfacing "Save failed" to the user. A transient
 *    DB hiccup is invisible.
 *
 * 4. **Visibility flush**: when the tab becomes hidden (user switches tabs
 *    or minimizes), any pending debounce is flushed immediately so edits are
 *    never left unsaved in a background tab.
 *
 * Adaptive debounce: structural changes (insert/move/delete/duplicate) save
 * fast (400ms) so the user sees "Saved" quickly; text edits wait longer
 * (2000ms) so active typing doesn't hammer the DB on every pause.
 */
export function useAutosave<T>(opts: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const { save, debounceTextMs = DEFAULT_TEXT_MS, debounceStructMs = DEFAULT_STRUCT_MS, maxRetries = DEFAULT_MAX_RETRIES } = opts;

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs — the autosave loop is timer-driven, not render-driven, so all
  // mutable state lives in refs to avoid stale closures inside setTimeout.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJsonRef = useRef<string | null>(null);
  const pendingDataRef = useRef<T | null>(null);
  const pendingKindRef = useRef<ChangeKind>("text");
  const inFlightRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  const doSaveRef = useRef<() => Promise<void>>(async () => { });

  /** Serialize data for the diff gate. JSON.stringify is deterministic for
   *  our block trees (object key order is insertion-stable in V8). */
  const serialize = useCallback((data: T): string => JSON.stringify(data), []);

  /** Core save loop — called when the debounce fires or flush is invoked. */
  const doSave = useCallback(async () => {
    const data = pendingDataRef.current;
    if (data === null) return;
    if (inFlightRef.current) return; // another save is running; it'll pick up pendingData

    inFlightRef.current = true;
    setSaveState("saving");

    const json = serialize(data);
    const res = await saveRef.current(data);

    if (res.ok) {
      lastSavedJsonRef.current = json;
      pendingDataRef.current = null;
      inFlightRef.current = false;
      retryCountRef.current = 0;
      setSaveState("saved");
      setErrorMessage(null);

      // If more data arrived while we were saving, fire the next save.
      if (pendingDataRef.current !== null) {
        // Use a 0ms timeout to avoid unbounded recursion on rapid changes.
        setTimeout(() => doSaveRef.current(), 0);
      } else if (flushResolveRef.current) {
        flushResolveRef.current(true);
        flushResolveRef.current = null;
      }
      return;
    }

    // Save failed — retry with backoff or surface the error.
    inFlightRef.current = false;
    if (retryCountRef.current < maxRetries) {
      const delay = BACKOFF_MS[retryCountRef.current] ?? 4000;
      retryCountRef.current++;
      retryTimerRef.current = setTimeout(() => doSaveRef.current(), delay);
      return;
    }

    // Exhausted retries — surface the error.
    pendingDataRef.current = null;
    retryCountRef.current = 0;
    setSaveState("error");
    setErrorMessage(res.error);
    if (flushResolveRef.current) {
      flushResolveRef.current(false);
      flushResolveRef.current = null;
    }
  }, [maxRetries, serialize]);

  useEffect(() => {
    doSaveRef.current = doSave;
  }, [doSave]);

  const schedule = useCallback(
    (data: T, kind: ChangeKind = "text") => {
      const json = serialize(data);
      // Diff gate — skip entirely if nothing changed since the last save.
      if (lastSavedJsonRef.current !== null && json === lastSavedJsonRef.current) {
        return;
      }

      pendingDataRef.current = data;
      pendingKindRef.current = kind;

      // Clear any pending debounce; set a fresh one with the appropriate delay.
      if (timerRef.current) clearTimeout(timerRef.current);
      const delay = kind === "structural" ? debounceStructMs : debounceTextMs;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        doSaveRef.current();
      }, delay);
    },
    [debounceTextMs, debounceStructMs, serialize],
  );

  const flush = useCallback(async (): Promise<boolean> => {
    // Nothing pending — nothing to flush.
    if (pendingDataRef.current === null) return true;

    // Cancel the debounce timer and save immediately.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // If a save is already in flight, wait for it to complete (it will pick
    // up pendingData). Return a promise that resolves when it's done.
    if (inFlightRef.current) {
      return new Promise<boolean>((resolve) => {
        flushResolveRef.current = resolve;
      });
    }

    return new Promise<boolean>((resolve) => {
      flushResolveRef.current = resolve;
      doSaveRef.current();
    });
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    pendingDataRef.current = null;
    inFlightRef.current = false;
    retryCountRef.current = 0;
  }, []);

  const resetBaseline = useCallback((data: T) => {
    lastSavedJsonRef.current = serialize(data);
    pendingDataRef.current = null;
    retryCountRef.current = 0;
    setSaveState("idle");
    setErrorMessage(null);
  }, [serialize]);

  // Visibility flush — when the tab is hidden, flush pending edits immediately.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && pendingDataRef.current !== null) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        doSave();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [doSave]);

  // Cleanup on unmount — cancel any pending timer.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return { saveState, errorMessage, schedule, flush, cancel, resetBaseline };
}
