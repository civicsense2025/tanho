"use client";

import { useEffect, useRef, useState } from "react";
import { categories, pickerDefs } from "@/blocks/registry";
import styles from "./editor.module.css";

/**
 * A compact circular ＋ button that opens a grouped block menu and inserts at
 * this position — the design's inline InsertMenu. Reused between canvas blocks
 * and (via BetweenInsert) in the stacked list.
 */
export function BetweenMenuButton({ onInsert }: { onInsert: (type: string) => void }) {
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
          {categories.map((cat) => {
            const items = pickerDefs(cat.id);
            if (!items.length) return null;
            return (
              <div key={cat.id}>
                <div className={styles.pickerCat}>{cat.label}</div>
                {items.map((d) => (
                  <button
                    key={d.type}
                    type="button"
                    className={styles.pickerItem}
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
export function BetweenInsert({ onInsert }: { onInsert: (type: string) => void }) {
  return (
    <div className={styles.between}>
      <BetweenMenuButton onInsert={onInsert} />
    </div>
  );
}
