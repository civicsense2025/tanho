"use client";

import type { Device } from "@/blocks/types";
import styles from "./editor-shell.module.css";

export const DEVICES: Record<Device, { w: number | null; label: string; glyph: string }> = {
  desktop: { w: null, label: "Desktop", glyph: "▭" },
  tablet: { w: 820, label: "Tablet · 820", glyph: "▢" },
  mobile: { w: 390, label: "Mobile · 390", glyph: "▯" },
};

const ORDER: Device[] = ["desktop", "tablet", "mobile"];

/** Desktop / tablet / mobile canvas-width toggle — the design's DeviceToggle. */
export function DeviceToggle({
  device,
  onChange,
}: {
  device: Device;
  onChange: (d: Device) => void;
}) {
  return (
    <div className={styles.segGroup} role="group" aria-label="Preview width">
      {ORDER.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={device === d}
          onClick={() => onChange(d)}
          title={DEVICES[d].label}
          className={device === d ? styles.segOn : styles.segBtn}
        >
          {DEVICES[d].glyph}
        </button>
      ))}
    </div>
  );
}
