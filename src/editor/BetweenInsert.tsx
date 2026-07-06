"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { categories, pickerDefs, isSuggestedFor } from "@/blocks/registry";
import { useEditor } from "./store";
import type { OnAddBlock } from "./BlockPicker";
import styles from "./editor.module.css";

/**
 * A compact circular ＋ button that opens a grouped block menu and inserts at
 * this position — the design's inline InsertMenu. Reused between canvas blocks
 * and (via BetweenInsert) in the stacked list. Filters to the store's
 * enabled-types set so disabled blocks never appear. When templating a content
 * type, surfaces one "Field" preset per field at the top (like the main picker).
 */
export function BetweenMenuButton({ onInsert }: { onInsert: OnAddBlock }) {
  const enabledTypes = useEditor((s) => s.enabledTypes);
  const ctx = useEditor((s) => s.contentTypeContext);
  const groups = useMemo(
    () =>
      categories.map((cat) => ({
        cat,
        items: pickerDefs(cat.id).filter((d) => !enabledTypes || enabledTypes.has(d.type)),
      })),
    [enabledTypes],
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className={styles.insertMenu}>
      <button
        type="button"
        className={styles.insertPlus}
        data-open={open || undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Insert a block here"
        title="Insert a block here"
      >
        ＋
      </button>
      {open ? (
        <div
          className={styles.pickerMenu}
          style={{ position: "absolute", zIndex: 45, left: "50%", top: "calc(100% + 6px)", transform: "translateX(-50%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctx && ctx.fields.length > 0 ? (
            <div>
              <div className={`${styles.pickerCat} ${styles.pickerCatSuggested}`}>Fields · {ctx.slug}</div>
              {ctx.fields.map((f) => (
                <button
                  key={`field:${f.key}`}
                  type="button"
                  className={`${styles.pickerItem} ${styles.pickerItemSuggested}`}
                  onClick={() => {
                    onInsert("field", { field: f.key, display: f.key === "title" ? "heading" : "auto" });
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
                    onClick={() => {
                      onInsert(d.type);
                      setOpen(false);
                    }}
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

/**
 * Between-block quick insert strip (stacked layout) — a thin hover-reveal row
 * wrapping the shared ＋ menu button.
 */
export function BetweenInsert({ onInsert }: { onInsert: OnAddBlock }) {
  return (
    <div className={styles.between}>
      <BetweenMenuButton onInsert={onInsert} />
    </div>
  );
}
