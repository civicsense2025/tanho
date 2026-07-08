"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * A cart line. `unitCents`/`name` are a DISPLAY snapshot only — the server
 * recomputes every price from the DB at checkout, so a tampered snapshot
 * changes nothing that's charged.
 */
export type CartLine = {
  productId: string;
  variantId?: string;
  qty: number;
  name: string;
  unitCents: number;
  currency: string;
  href: string;
};

type CartApi = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const STORAGE_KEY = "lamina.cart.v1";
const EMPTY: CartLine[] = [];

/** Stable identity for a line (product + optional variant). */
export const lineKey = (l: Pick<CartLine, "productId" | "variantId">) =>
  l.variantId ? `${l.productId}:${l.variantId}` : l.productId;

/**
 * localStorage-backed cart store, exposed to React via useSyncExternalStore.
 * The persisted string IS the source of truth, so hydration is safe (server
 * snapshot = EMPTY) and multiple tabs stay in sync via the storage event.
 */
function readStored(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cache: { raw: string | null; value: CartLine[] } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function getSnapshot(): CartLine[] {
  // Memoize by raw string so useSyncExternalStore sees a stable reference
  // until the persisted value actually changes.
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cache.raw) cache = { raw, value: readStored() };
  return cache.value;
}

const getServerSnapshot = (): CartLine[] => EMPTY;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable — fall through, still notify in-memory
  }
  cache = { raw: JSON.stringify(next), value: next };
  for (const cb of listeners) cb();
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((line: CartLine) => {
    const prev = getSnapshot();
    const key = lineKey(line);
    const exists = prev.some((l) => lineKey(l) === key);
    const next = exists
      ? prev.map((l) => (lineKey(l) === key ? { ...l, qty: l.qty + line.qty } : l))
      : [...prev, line];
    write(next);
    setOpen(true);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    const next = getSnapshot()
      .map((l) => (lineKey(l) === key ? { ...l, qty: Math.max(0, Math.trunc(qty)) } : l))
      .filter((l) => l.qty > 0);
    write(next);
  }, []);

  const remove = useCallback((key: string) => {
    write(getSnapshot().filter((l) => lineKey(l) !== key));
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo<CartApi>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotalCents = lines.reduce((n, l) => n + l.unitCents * l.qty, 0);
    return { lines, count, subtotalCents, add, setQty, remove, clear, open, setOpen };
  }, [lines, add, setQty, remove, clear, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
