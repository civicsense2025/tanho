"use client";

import type { MenuItem } from "../validation";
import {
  flattenItems,
  indentItem,
  moveItem,
  newItem,
  outdentItem,
  removeItem,
  updateItem,
} from "./item-ops";
import { MenuItemRow } from "./MenuItemRow";
import { Button } from "@/components/core/Button";

/**
 * Nested item editor. Rows are the flattened tree; ↑↓ reorder within
 * siblings, → indents under the previous sibling, ← lifts back out.
 */
export function MenuBuilder({
  items,
  onChange,
}: {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
}) {
  const rows = flattenItems(items);

  return (
    <div>
      {rows.length === 0 ? (
        <p
          style={{
            margin: "0 0 var(--space-3)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          No items yet — add the first link below.
        </p>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: "var(--space-3)" }}>
          {rows.map((row) => (
            <MenuItemRow
              key={row.item.id}
              row={row}
              onPatch={(patch) => onChange(updateItem(items, row.item.id, patch))}
              onMove={(dir) => onChange(moveItem(items, row.item.id, dir))}
              onIndent={() => onChange(indentItem(items, row.item.id))}
              onOutdent={() => onChange(outdentItem(items, row.item.id))}
              onRemove={() => onChange(removeItem(items, row.item.id))}
            />
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, newItem()])}>
        + Add item
      </Button>
    </div>
  );
}
