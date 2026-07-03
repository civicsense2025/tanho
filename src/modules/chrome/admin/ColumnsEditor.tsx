"use client";

import type { Menu } from "@/modules/menus/queries";
import type { FooterColumn } from "../validation";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";

/** Footer menu-column rows: title + menu, up to four. */
export function ColumnsEditor({
  columns,
  menus,
  onChange,
}: {
  columns: FooterColumn[];
  menus: Menu[];
  onChange: (columns: FooterColumn[]) => void;
}) {
  const set = (i: number, patch: Partial<FooterColumn>) =>
    onChange(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {columns.map((col, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <Input
            value={col.title}
            placeholder="Column title"
            aria-label={`Column ${i + 1} title`}
            onChange={(e) => set(i, { title: e.target.value })}
            style={{ flex: 1 }}
          />
          <Select
            value={col.menuId}
            aria-label={`Column ${i + 1} menu`}
            onChange={(e) => set(i, { menuId: e.target.value })}
          >
            <option value="">No menu</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" aria-label="Remove column" onClick={() => onChange(columns.filter((_, idx) => idx !== i))}>
            ✕
          </Button>
        </div>
      ))}
      {columns.length < 4 ? (
        <div>
          <Button variant="outline" size="sm" onClick={() => onChange([...columns, { title: "", menuId: "" }])}>
            + Add column
          </Button>
        </div>
      ) : null}
    </div>
  );
}
