"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { basename } from "./format";
import { MediaPickerModal } from "./MediaPickerModal";
import styles from "./sheet.module.css";

/**
 * Like MediaPicker, but for fields that store a media *id* (not a URL) — e.g.
 * the theme favicon and the chrome logo. Returns both the id (persisted) and
 * the url (shown as the thumbnail). Shares the image chooser (MediaPickerModal)
 * with MediaPicker. Accepts uploaded images including sanitized SVGs.
 */
export function MediaIdPicker({
  value,
  previewUrl,
  onChange,
}: {
  /** The current media id (or null). */
  value: string | null;
  /** The current media's URL for the thumbnail (resolved by the parent). */
  previewUrl?: string | null;
  onChange: (next: { id: string; url: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // The URL of whatever was just picked (so the thumb updates without a reload).
  const [localUrl, setLocalUrl] = useState<string | null>(previewUrl ?? null);
  const shownUrl = localUrl ?? previewUrl ?? null;

  return (
    <div className={styles.fieldControl}>
      {shownUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 24px admin thumb; served from our media route
        <img src={shownUrl} alt="" className={styles.fieldThumb} />
      ) : (
        <span className={styles.fieldThumbEmpty} aria-hidden />
      )}
      <span className={`${styles.fieldName} ${value ? "" : styles.fieldNone}`} title={shownUrl ?? ""}>
        {shownUrl ? basename(shownUrl) : "None"}
      </span>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Choose
      </Button>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLocalUrl(null);
            onChange(null);
          }}
        >
          Clear
        </Button>
      )}
      {open && (
        <MediaPickerModal
          // id-based field: a /public asset has no media-row id to store, so the
          // Public tab is hidden here (only DB uploads carry an id).
          allowPublic={false}
          onPick={(item) => {
            setLocalUrl(item.url);
            onChange({ id: item.id, url: item.url });
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
