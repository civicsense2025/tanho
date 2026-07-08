"use client";

import { useState, type ComponentType } from "react";
import { Grid3x3, BoxSelect, Ruler, Rows3, Settings2 } from "lucide-react";
import { COLUMN_OPTIONS, GRID_SIZE_OPTIONS, type UseGridlinesResult } from "./useGridlines";
import styles from "./gridlines.module.css";

/** Compact segmented toggle for the gridlines/guides editing aids, plus a
 *  settings popover for column count and grid size. Receives the shared
 *  `useGridlines` state from the parent so the toggle and `GridlinesOverlay`
 *  stay in sync (one hook instance, two consumers). */
export function GridlinesToggle({
  gridlines,
  setGridlines,
  baselineGrid,
  setBaselineGrid,
  blockOutlines,
  setBlockOutlines,
  rulers,
  setRulers,
  columns,
  setColumns,
  gridSize,
  setGridSize,
}: UseGridlinesResult) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className={styles.toggleWrap}>
      <div className={styles.segGroup} role="group" aria-label="Editing guides">
        <ToggleButton
          active={gridlines}
          onClick={() => setGridlines(!gridlines)}
          label="Toggle column gridlines"
          Icon={Grid3x3}
        />
        <ToggleButton
          active={baselineGrid}
          onClick={() => setBaselineGrid(!baselineGrid)}
          label="Toggle 8px baseline grid"
          Icon={Rows3}
        />
        <ToggleButton
          active={blockOutlines}
          onClick={() => setBlockOutlines(!blockOutlines)}
          label="Toggle block outlines"
          Icon={BoxSelect}
        />
        <ToggleButton
          active={rulers}
          onClick={() => setRulers(!rulers)}
          label="Toggle rulers"
          Icon={Ruler}
        />
        <button
          type="button"
          title="Grid settings"
          aria-label="Grid settings"
          aria-expanded={settingsOpen}
          className={`${styles.segBtn} ${settingsOpen ? styles.segOn : ""}`}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <Settings2 size={16} />
        </button>
      </div>
      {settingsOpen ? (
        <div className={styles.popover} role="dialog" aria-label="Grid settings">
          <SettingRow label="Columns">
            {COLUMN_OPTIONS.map((c) => (
              <Chip key={c} active={columns === c} onClick={() => setColumns(c)}>
                {c}
              </Chip>
            ))}
          </SettingRow>
          <SettingRow label="Grid size">
            {GRID_SIZE_OPTIONS.map((g) => (
              <Chip key={g} active={gridSize === g} onClick={() => setGridSize(g)}>
                {g}px
              </Chip>
            ))}
          </SettingRow>
        </div>
      ) : null}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`${styles.segBtn} ${active ? styles.segOn : ""}`}
      onClick={onClick}
    >
      <Icon size={16} />
    </button>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.settingRow}>
      <span className={styles.settingLabel}>{label}</span>
      <div className={styles.chipRow}>{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${styles.chip} ${active ? styles.chipOn : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
