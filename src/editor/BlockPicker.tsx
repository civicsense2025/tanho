"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { categories, pickerDefs, isSuggestedFor } from "@/blocks/registry";
import type { BlockCategory } from "@/blocks/types";
import { Button } from "@/components/core/Button";
import { useEditor } from "./store";
import styles from "./editor.module.css";

export type PickerStyle = "menu" | "row" | "panel" | "command";
/** One category, several categories, or (undefined) all of them. */
export type PickerCategory = BlockCategory | BlockCategory[];

type Def = { type: string; label: string; blurb: string };
/** Compiled picker defs filtered to the store's enabled-types set (when set),
 *  and optionally scoped to one or more categories (e.g. the chrome editor,
 *  which offers chrome + content + layout + media). */
function useAllDefs(only?: PickerCategory): Def[] {
  const enabledTypes = useEditor((s) => s.enabledTypes);
  // Serialize the (possibly array) scope for a stable memo dependency.
  const scopeKey = Array.isArray(only) ? only.join(",") : (only ?? "");
  return useMemo(
    () => {
      const allow = only == null ? null : new Set(Array.isArray(only) ? only : [only]);
      return categories
        .filter((c) => !allow || allow.has(c.id))
        .flatMap((c) => pickerDefs(c.id))
        .filter((d) => !enabledTypes || enabledTypes.has(d.type));
    },
    [enabledTypes, scopeKey], // eslint-disable-line react-hooks/exhaustive-deps
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
/** Insert a block type, optionally with a starting content patch (used by the
 *  content-type "Field" suggestions to pre-bind a field block to a column). */
export type OnAddBlock = (type: string, contentPatch?: Record<string, unknown>) => void;

export function BlockPicker({
  onAdd,
  label = "Add block",
  style = "menu",
  category,
}: {
  onAdd: OnAddBlock;
  label?: string;
  style?: PickerStyle;
  /** Scope the picker to one or more block categories (e.g. the chrome editor). */
  category?: PickerCategory;
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

/** Compiled defs grouped by category, filtered to the store's enabled set and
 *  optionally to a single category. */
function useGroupedDefs(
  only?: PickerCategory,
): Array<{ cat: (typeof categories)[number]; items: Def[] }> {
  const enabledTypes = useEditor((s) => s.enabledTypes);
  const scopeKey = Array.isArray(only) ? only.join(",") : (only ?? "");
  return useMemo(
    () => {
      const allow = only == null ? null : new Set(Array.isArray(only) ? only : [only]);
      return categories
        .filter((c) => !allow || allow.has(c.id))
        .map((cat) => ({
          cat,
          items: pickerDefs(cat.id).filter((d) => !enabledTypes || enabledTypes.has(d.type)),
        }));
    },
    [enabledTypes, scopeKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
}

function MenuPicker({ onAdd, label, category }: { onAdd: OnAddBlock; label: string; category?: PickerCategory }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const groups = useGroupedDefs(category);
  const ctx = useEditor((s) => s.contentTypeContext);
  return (
    <div ref={ref} className={styles.picker}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>+ {label}</Button>
      {open ? (
        <div className={styles.pickerMenu}>
          {/* When templating a content type, surface one "Field" preset per
              field at the top — each drops a field block already bound to that
              column, so the owner doesn't hunt for it or type a token. */}
          {ctx && ctx.fields.length > 0 ? (
            <div>
              <div className={`${styles.pickerCat} ${styles.pickerCatSuggested}`}>
                Fields · {ctx.slug}
              </div>
              {ctx.fields.map((f) => (
                <button
                  key={`field:${f.key}`}
                  type="button"
                  className={`${styles.pickerItem} ${styles.pickerItemSuggested}`}
                  onClick={() => {
                    onAdd("field", { field: f.key, display: f.key === "title" ? "heading" : "auto" });
                    setOpen(false);
                  }}
                >
                  <span className={styles.pickerItemLabel}>{f.label}</span>
                  <span className={styles.pickerItemBlurb}>Show this field from the row</span>
                </button>
              ))}
            </div>
          ) : null}
          {groups.map(({ cat, items }) => {
            if (!items.length) return null;
            return (
              <div key={cat.id}>
                <div className={styles.pickerCat}>{cat.label}</div>
                {items.map((d) => (
                  <button
                    key={d.type}
                    type="button"
                    className={`${styles.pickerItem} ${ctx && isSuggestedFor(d.type, ctx.slug) ? styles.pickerItemSuggested : ""}`}
                    onClick={() => { onAdd(d.type); setOpen(false); }}
                  >
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

function RowPicker({ onAdd, category }: { onAdd: OnAddBlock; category?: PickerCategory }) {
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

function PanelPicker({ onAdd, label, category }: { onAdd: OnAddBlock; label: string; category?: PickerCategory }) {
  const allDefs = useAllDefs(category);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutside(open, () => setOpen(false));
  const list = useMemo(() => allDefs.filter((d) => (d.label + d.blurb).toLowerCase().includes(q.toLowerCase())), [q, allDefs]);
  return (
    <div ref={ref} className={styles.picker}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>+ {label}</Button>
      {open ? (
        <div className={styles.pickerPanel}>
          <input autoFocus className={styles.pickerSearch} placeholder="Search blocks…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className={styles.pickerGrid}>
            {list.map((d) => (
              <button key={d.type} type="button" className={styles.pickerGridItem} title={d.blurb} onClick={() => { onAdd(d.type); setOpen(false); }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CommandPicker({ onAdd, label, category }: { onAdd: OnAddBlock; label: string; category?: PickerCategory }) {
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
