"use client";

import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import type { ExtensionsSettings } from "../validation";
import styles from "./scheduling.module.css";

type Extension = ExtensionsSettings["items"][number];

/** A settings bag read as a loosely-typed record — extensionSchema.settings is opaque. */
type Settings = Record<string, unknown>;

const str = (settings: Settings, key: string, fallback: string) =>
  typeof settings[key] === "string" ? (settings[key] as string) : fallback;
const num = (settings: Settings, key: string, fallback: number) =>
  typeof settings[key] === "number" ? (settings[key] as number) : fallback;
const bool = (settings: Settings, key: string, fallback: boolean) =>
  typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;

/**
 * Inline settings for one extension, shown while its toggle is on. Fields
 * match the design's per-extension bags (pb-sched-admin.js ExtensionsTab):
 * email-reminder timing, sms-reminder quiet hours, cancel-policy cutoff,
 * followup delay. Unknown extension ids render no extra fields.
 */
export function ExtensionSettingsFields({
  extension,
  onPatch,
}: {
  extension: Extension;
  onPatch: (patch: Settings) => void;
}) {
  const s = extension.settings;

  if (extension.id === "email-reminder") {
    return (
      <div className={styles.rowGrid}>
        <span className={styles.label}>First reminder</span>
        <Select
          value={str(s, "timing", "24h")}
          onChange={(e) => onPatch({ timing: e.target.value })}
        >
          <option value="48h">48h before</option>
          <option value="24h">24h before</option>
          <option value="2h">2h before</option>
        </Select>
        <span className={styles.label}>Hours before</span>
        <Input
          type="number"
          min={0}
          max={720}
          value={num(s, "hoursBefore", 24)}
          onChange={(e) => onPatch({ hoursBefore: Number(e.target.value) })}
        />
      </div>
    );
  }

  if (extension.id === "sms-reminder") {
    return (
      <div className={styles.rowGrid}>
        <span className={styles.label}>Send</span>
        <Select
          value={str(s, "timing", "2h")}
          onChange={(e) => onPatch({ timing: e.target.value })}
        >
          <option value="24h">24h before</option>
          <option value="2h">2h before</option>
          <option value="30m">30m before</option>
        </Select>
        <span className={styles.label}>Quiet hours</span>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <input
            type="checkbox"
            checked={bool(s, "quietHours", true)}
            onChange={(e) => onPatch({ quietHours: e.target.checked })}
          />
          <span className={styles.faint}>Don&apos;t send between 9pm–8am local time</span>
        </label>
      </div>
    );
  }

  if (extension.id === "cancel-policy") {
    return (
      <div className={styles.rowGrid}>
        <span className={styles.label}>Cutoff (hours before)</span>
        <Input
          type="number"
          min={0}
          max={720}
          style={{ maxWidth: "8rem" }}
          value={num(s, "cutoffHours", 24)}
          onChange={(e) => onPatch({ cutoffHours: Number(e.target.value) })}
        />
      </div>
    );
  }

  if (extension.id === "followup") {
    return (
      <div className={styles.rowGrid}>
        <span className={styles.label}>Send after meeting ends</span>
        <Select
          value={str(s, "delay", "1d")}
          onChange={(e) => onPatch({ delay: e.target.value })}
        >
          <option value="0h">Immediately</option>
          <option value="2h">2 hours</option>
          <option value="1d">Next day</option>
        </Select>
      </div>
    );
  }

  return null;
}
