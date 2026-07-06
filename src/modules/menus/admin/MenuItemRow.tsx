"use client";

import { useState } from "react";
import { DROPDOWN_STYLES, type DropdownStyle, type MenuItem } from "../validation";
import type { FlatRow } from "./item-ops";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import styles from "./menu-item-row.module.css";

/** One row of the menu builder: label + href, ops, expandable extras. */
export function MenuItemRow({
  row,
  onPatch,
  onMove,
  onIndent,
  onOutdent,
  onRemove,
}: {
  row: FlatRow;
  onPatch: (patch: Partial<MenuItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { item, depth } = row;

  return (
    <div style={{ paddingLeft: depth * 26, borderBottom: "1px solid var(--border)" }}>
      <div className={styles.main}>
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "▾" : "▸"}
        </Button>
        <Input
          value={item.label}
          placeholder="Label"
          aria-label="Label"
          onChange={(e) => onPatch({ label: e.target.value })}
          style={{ flex: 1.1 }}
        />
        <Input
          value={item.href}
          placeholder="/path, #anchor or https://…"
          aria-label="Link"
          onChange={(e) => onPatch({ href: e.target.value })}
          style={{ flex: 1.4, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
        />
        <span style={{ display: "flex", gap: 2 }}>
          <Button variant="ghost" size="sm" disabled={row.first} onClick={() => onMove(-1)} aria-label="Move up">↑</Button>
          <Button variant="ghost" size="sm" disabled={row.last} onClick={() => onMove(1)} aria-label="Move down">↓</Button>
          <Button variant="ghost" size="sm" disabled={!row.canOutdent} onClick={onOutdent} aria-label="Outdent">←</Button>
          <Button variant="ghost" size="sm" disabled={!row.canIndent} onClick={onIndent} aria-label="Indent as child">→</Button>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove">✕</Button>
        </span>
      </div>
      {open ? (
        <div className={styles.meta}>
          <Select
            value={item.dropdownStyle ?? ""}
            aria-label="Dropdown style"
            onChange={(e) =>
              onPatch({
                dropdownStyle: e.target.value ? (e.target.value as DropdownStyle) : undefined,
              })
            }
          >
            <option value="">Dropdown: auto</option>
            {DROPDOWN_STYLES.map((s) => (
              <option key={s} value={s}>
                Dropdown: {s}
              </option>
            ))}
          </Select>
          <Input
            value={item.group ?? ""}
            placeholder="Group (mega columns)"
            aria-label="Group"
            onChange={(e) => onPatch({ group: e.target.value || undefined })}
          />
          <Input
            value={item.icon ?? ""}
            placeholder="Icon"
            aria-label="Icon"
            onChange={(e) => onPatch({ icon: e.target.value || undefined })}
          />
          <Input
            value={item.desc ?? ""}
            placeholder="Short description (cards)"
            aria-label="Description"
            onChange={(e) => onPatch({ desc: e.target.value || undefined })}
          />
        </div>
      ) : null}
    </div>
  );
}
