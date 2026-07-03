"use client";

import { useState } from "react";
import { MediaPicker } from "@/modules/media/admin/MediaPicker";
import styles from "./commerce.module.css";

/** Gallery field: a grid of chosen images plus a MediaPicker to add one. */
export function PhotosField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [pending, setPending] = useState("");

  const add = (url: string) => {
    if (url && !images.includes(url)) onChange([...images, url]);
    setPending("");
  };
  const remove = (url: string) => onChange(images.filter((i) => i !== url));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {images.length > 0 ? (
        <div className={styles.gallery}>
          {images.map((url) => (
            <div key={url} className={styles.galleryItem}>
              {/* eslint-disable-next-line @next/next/no-img-element -- author media thumb; next/image needs sizing + loader config */}
              <img src={url} alt="" className={styles.galleryImg} />
              <button
                type="button"
                className={styles.galleryRemove}
                aria-label="Remove image"
                onClick={() => remove(url)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <span className={styles.faint}>No photos yet.</span>
      )}
      <MediaPicker value={pending} onChange={add} />
    </div>
  );
}
