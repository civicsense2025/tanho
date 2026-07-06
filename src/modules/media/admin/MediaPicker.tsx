"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { basename } from "./format";
import { MediaPickerModal } from "./MediaPickerModal";
import styles from "./sheet.module.css";

/**
 * Compact media field control for the editor: current value (24px thumb +
 * basename, or "None") with Choose / Clear. Choose opens the shared image
 * chooser (MediaPickerModal); picking returns the asset's public URL via
 * onChange. For fields that store a media *id* instead, use MediaIdPicker.
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
        <MediaPickerModal
          onPick={(item) => {
            onChange(item.url);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
