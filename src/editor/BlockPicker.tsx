"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { categories, pickerDefs } from "@/blocks/registry";
import { Button } from "@/components/core/Button";
import { useEditor } from "./store";
import type { BlockCategory } from "@/blocks/types";
import styles from "./editor.module.css";

export type PickerStyle = "menu" | "row" | "panel" | "command";

type Def = { type: string; label: string; blurb: string };
/** Compiled picker defs filtered to the store's enabled-types set (when set). */
function useAllDefs(categoryIds?: BlockCategory[]): Def[] {
  const enabledTypes = useEditor((s) => s.enabledTypes);
  return useMemo(
    () =>
      categories
        .filter((c) => (categoryIds ? categoryIds.includes(c.id) : true))
        .flatMap((c) => pickerDefs(c.id))
        .filter((d) => !enabledTypes || enabledTypes.has(d.type)),
    [enabledTypes, categoryIds],
  );
}

/**
 * Block picker with four styles (the design's pb-picker):
 *  - menu:    a grouped "+ Add block" dropdown (the default)
 *  - row:     a flat outline-button row of every block
 *  - panel:   a drawer with a search box + category grid
 *  - command: a command palette — type to filter, arrow keys to move, Enter
 *
 * Filtering to the DB registry's enabled block types is driven by the editor
 * store (`enabledTypes`, server-fetched by PageEditor) so a disabled block
 * never shows in the picker.
 */
export function BlockPicker({
  onAdd,
  label = "Add block",
  style = "menu",
  category,
}: {
  onAdd: (type: string, patch?: Record<string, unknown>) => void;
  label?: string;
  style?: PickerStyle;
  category?: BlockCategory[];
}) {
  if (style === "row") return <RowPicker onAdd={onAdd} category={category} />;
  if (style === "panel") return <PanelPicker onAdd={onAdd} label={label} category={category} />;
  if (style === "command") return <CommandPicker onAdd={onAdd} label={label} category={category} />;
  return <MenuPicker onAdd={onAdd} label={label} category={category} />;
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, close]);
  return ref;
}

/** Compiled defs grouped by category, filtered to the store's enabled set. */
function useGroupedDefs(categoryIds?: BlockCategory[]): Array<{ cat: (typeof categories)[number]; items: Def[] }> {
  const enabledTypes = useEditor((s) => s.enabledTypes);
  return useMemo(
    () =>
      categories
        .filter((c) => (categoryIds ? categoryIds.includes(c.id) : true))
        .map((cat) => ({
          cat,
          items: pickerDefs(cat.id).filter((d) => !enabledTypes || enabledTypes.has(d.type)),
        })),
    [enabledTypes, categoryIds],
  );
}

function MenuPicker({ onAdd, label, category }: { onAdd: (t: string, patch?: Record<string, unknown>) => void; label: string; category?: BlockCategory[] }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const groups = useGroupedDefs(category);
  return (
    <div ref={ref} className={styles.picker}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>+ {label}</Button>
      {open ? (
        <div className={styles.pickerMenu}>
          {groups.map(({ cat, items }) => {
            if (!items.length) return null;
            return (
              <div key={cat.id}>
                <div className={styles.pickerCat}>{cat.label}</div>
                {items.map((d) => (
                  <button key={d.type} type="button" className={styles.pickerItem} onClick={() => { onAdd(d.type); setOpen(false); }}>
                    <span className={styles.pickerItemLabel}>{d.label}</span>
                    <span className={styles.pickerItemBlurb}>{d.blurb}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RowPicker({ onAdd, category }: { onAdd: (t: string, patch?: Record<string, unknown>) => void; category?: BlockCategory[] }) {
  const defs = useAllDefs(category);
  return (
    <div className={styles.rowPicker}>
      {defs.map((d) => (
        <button key={d.type} type="button" className={styles.rowChip} title={d.blurb} onClick={() => onAdd(d.type)}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

function PanelPicker({ onAdd, label, category }: { onAdd: (t: string, patch?: Record<string, unknown>) => void; label: string; category?: BlockCategory[] }) {
  const groups = useGroupedDefs(category);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutside(open, () => setOpen(false));
  const ql = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .map(({ cat, items }) => ({
          cat,
          items: ql ? items.filter((d) => (d.label + d.blurb).toLowerCase().includes(ql)) : items,
        }))
        .filter((g) => g.items.length > 0),
    [groups, ql],
  );
  const hasResults = filtered.some((g) => g.items.length > 0);
  return (
    <div ref={ref} className={styles.picker}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>+ {label}</Button>
      {open ? (
        <div className={styles.pickerPanel}>
          <input autoFocus className={styles.pickerSearch} placeholder="Search blocks…" value={q} onChange={(e) => setQ(e.target.value)} />
          {hasResults ? (
            filtered.map(({ cat, items }) => (
              <div key={cat.id} className={styles.pickerGridGroup}>
                <div className={styles.pickerGridCat}>{cat.label}</div>
                <div className={styles.pickerGrid}>
                  {items.map((d) => (
                    <button key={d.type} type="button" className={styles.pickerGridItem} title={d.blurb} onClick={() => { onAdd(d.type); setOpen(false); }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.pickerCat}>No blocks match.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CommandPicker({ onAdd, label, category }: { onAdd: (t: string, patch?: Record<string, unknown>) => void; label: string; category?: BlockCategory[] }) {
  const allDefs = useAllDefs(category);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const ref = useOutside(open, () => setOpen(false));
  const list = useMemo(() => allDefs.filter((d) => (d.label + d.blurb).toLowerCase().includes(q.toLowerCase())), [q, allDefs]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && list[sel]) { onAdd(list[sel].type); setOpen(false); setQ(""); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={ref} className={styles.picker}>
      <Button variant="outline" size="sm" onClick={() => { setOpen((o) => !o); setSel(0); }}>+ {label}</Button>
      {open ? (
        <div className={styles.pickerCommand}>
          <input autoFocus className={styles.pickerSearch} placeholder="Type a block name…" value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} />
          <div className={styles.pickerCommandList}>
            {list.map((d, i) => (
              <button
                key={d.type}
                type="button"
                className={i === sel ? styles.pickerCommandItemSel : styles.pickerCommandItem}
                onMouseEnter={() => setSel(i)}
                onClick={() => { onAdd(d.type); setOpen(false); setQ(""); }}
              >
                <span className={styles.pickerItemLabel}>{d.label}</span>
                <span className={styles.pickerItemBlurb}>{d.blurb}</span>
              </button>
            ))}
            {list.length === 0 ? <div className={styles.pickerCat}>No blocks match.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
