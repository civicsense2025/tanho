"use client";

import { useEffect, useState } from "react";
import { listImageMediaAction, type PickerItem } from "../actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { basename } from "./format";
import styles from "./sheet.module.css";

/**
 * Compact media field control for the editor: current value (24px thumb +
 * basename, or "None") with Choose / Clear. Choose opens a modal of
 * image-kind media; clicking a thumb returns its public URL via onChange.
 */
export function MediaPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.fieldControl}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- 24px admin thumb of author media; next/image needs sizing + loader config
        <img src={value} alt="" className={styles.fieldThumb} />
      ) : (
        <span className={styles.fieldThumbEmpty} aria-hidden />
      )}
      <span className={`${styles.fieldName} ${value ? "" : styles.fieldNone}`} title={value}>
        {value ? basename(value) : "None"}
      </span>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Choose
      </Button>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange("")}>
          Clear
        </Button>
      )}
      {open && (
        <PickerModal
          onPick={(url) => {
            onChange(url);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PickerModal({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<PickerItem[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    void listImageMediaAction().then((res) => {
      if (alive) setItems(res.ok ? res.data ?? [] : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = q.trim().toLowerCase();
  const visible = (items ?? []).filter(
    (i) => !needle || `${i.name} ${i.alt}`.toLowerCase().includes(needle),
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Choose an image"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>Choose an image</h3>
          <span style={{ flex: 1 }} />
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <Input
          placeholder="Search images"
          aria-label="Search images"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {items === null ? (
          <p className={styles.pickerEmpty}>Loading media…</p>
        ) : visible.length === 0 ? (
          <p className={styles.pickerEmpty}>
            {items.length === 0
              ? "No images yet — upload some in the Media library."
              : "Nothing matches this search."}
          </p>
        ) : (
          <div className={styles.pickerGrid}>
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.pickerItem}
                onClick={() => onPick(item.url)}
                title={item.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- picker thumb of author media; next/image needs sizing + loader config */}
                <img src={item.url} alt={item.alt || item.name} loading="lazy" className={styles.pickerImg} />
                <span className={styles.pickerName}>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
