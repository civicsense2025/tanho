"use client";

import styles from "./chrome.module.css";

type SegOption = { value: string; label: string };

/** Segmented control — the design's PBC.Seg (on/off toggles, small enums). */
export function Seg({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SegOption[];
}) {
  return (
    <div className={styles.seg} role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={`${styles.segBtn} ${value === o.value ? styles.segBtnActive : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Boolean convenience wrapper over Seg. */
export function Toggle({
  value,
  onChange,
  on = "On",
  off = "Off",
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  on?: string;
  off?: string;
}) {
  return (
    <Seg
      value={value ? "on" : "off"}
      onChange={(v) => onChange(v === "on")}
      options={[
        { value: "off", label: off },
        { value: "on", label: on },
      ]}
    />
  );
}
