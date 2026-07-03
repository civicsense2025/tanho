import { createId } from "@paralleldrive/cuid2";
import type { MenuItem } from "../validation";

/**
 * Pure, immutable operations on a menu item tree — shared by the builder UI
 * and unit-tested in isolation. Every op returns a new tree.
 */

export const newItem = (): MenuItem => ({ id: `mi_${createId()}`, label: "", href: "/" });

export const MAX_DEPTH = 2; // 0 = top level; children may nest twice

export type FlatRow = {
  item: MenuItem;
  depth: number;
  first: boolean;
  last: boolean;
  canIndent: boolean;
  canOutdent: boolean;
};

/** Depth-first flatten with the per-row affordances the UI needs. */
export function flattenItems(items: MenuItem[], depth = 0): FlatRow[] {
  return items.flatMap((item, i) => [
    {
      item,
      depth,
      first: i === 0,
      last: i === items.length - 1,
      canIndent: i > 0 && depth < MAX_DEPTH,
      canOutdent: depth > 0,
    },
    ...flattenItems(item.children ?? [], depth + 1),
  ]);
}

export function updateItem(items: MenuItem[], id: string, patch: Partial<MenuItem>): MenuItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, ...patch }
      : item.children?.length
        ? { ...item, children: updateItem(item.children, id, patch) }
        : item,
  );
}

export function removeItem(items: MenuItem[], id: string): MenuItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.children?.length ? { ...item, children: removeItem(item.children, id) } : item,
    );
}

/** Swap with the previous/next sibling (dir −1 = up, +1 = down). */
export function moveItem(items: MenuItem[], id: string, dir: -1 | 1): MenuItem[] {
  const idx = items.findIndex((item) => item.id === id);
  if (idx !== -1) {
    const to = idx + dir;
    if (to < 0 || to >= items.length) return items;
    const next = [...items];
    [next[idx], next[to]] = [next[to], next[idx]];
    return next;
  }
  return items.map((item) =>
    item.children?.length ? { ...item, children: moveItem(item.children, id, dir) } : item,
  );
}

/** Make the item the last child of its previous sibling. */
export function indentItem(items: MenuItem[], id: string): MenuItem[] {
  const idx = items.findIndex((item) => item.id === id);
  if (idx > 0) {
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    const prev = next[idx - 1];
    next[idx - 1] = { ...prev, children: [...(prev.children ?? []), moved] };
    return next;
  }
  return items.map((item) =>
    item.children?.length ? { ...item, children: indentItem(item.children, id) } : item,
  );
}

/** Move the item out of its parent, placing it right after the parent. */
export function outdentItem(items: MenuItem[], id: string): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    const kids = item.children ?? [];
    const idx = kids.findIndex((k) => k.id === id);
    if (idx !== -1) {
      const rest = kids.filter((k) => k.id !== id);
      out.push(rest.length ? { ...item, children: rest } : { ...item, children: undefined });
      out.push(kids[idx]);
    } else {
      out.push(kids.length ? { ...item, children: outdentItem(kids, id) } : item);
    }
  }
  return out;
}
