"use client";

import { useEffect, useState } from "react";
import { listImageMediaAction, type PickerItem } from "@/modules/media/actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import styles from "./profile.module.css";

/**
 * Avatar field: shows the current image (or an empty circle) with Choose /
 * Clear. Choose opens an image picker; picking returns the media id (stored
 * on the profile) and its URL (for the thumbnail preview).
 */
export function AvatarPicker({
  url,
  onChange,
}: {
  url: string;
  onChange: (mediaId: string | null, url: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.avatarField}>
      <span className={styles.avatarThumb}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={styles.avatarImg} />
        ) : null}
      </span>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Choose
      </Button>
      {url ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(null, "")}>
          Clear
        </Button>
      ) : null}
      {open ? (
        <PickerModal
          onPick={(item) => {
            onChange(item.id, item.url);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function PickerModal({
  onPick,
  onClose,
}: {
  onPick: (item: PickerItem) => void;
  onClose: () => void;
}) {
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
    <div className={styles.overlay} onClick={onClose} role="presentation">
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
                onClick={() => onPick(item)}
                title={item.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt || item.name}
                  loading="lazy"
                  className={styles.pickerImg}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
