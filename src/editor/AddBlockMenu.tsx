"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { categories, pickerDefs } from "@/blocks/registry";
import { Button } from "@/components/core/Button";
import { useEditor } from "./store";
import styles from "./editor.module.css";

/** Simple category-grouped block picker (row/menu/panel/palette in Phase 4). */
export function AddBlockMenu({
  onAdd,
  label = "Add block",
}: {
  onAdd: (type: string) => void;
  label?: string;
}) {
  const enabledTypes = useEditor((s) => s.enabledTypes);
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
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className={styles.picker}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        + {label}
      </Button>
      {open ? (
        <div className={styles.pickerMenu}>
          {groups.map(({ cat, items }) => {
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
                      onAdd(d.type);
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
