"use client";

import type { MediaWithUsage } from "../queries";
import { needsCredit } from "../licenses";
import { Input } from "@/components/forms/Input";
import {
  anyFilterActive,
  EMPTY_FILTERS,
  toggleInList,
  type FiltersState,
  type KindFilter,
} from "./filtering";
import styles from "./media.module.css";

const KIND_TABS: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "doc", label: "Docs" },
];

/** Search + kind tabs + compliance chips + tag pill row + summary line. */
export function MediaToolbar({
  filters,
  onChange,
  tags,
  total,
  visible,
}: {
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  tags: string[];
  total: number;
  visible: MediaWithUsage[];
}) {
  const set = (patch: Partial<FiltersState>) => onChange({ ...filters, ...patch });
  const active = anyFilterActive(filters);
  const missingCredit = visible.filter(needsCredit).length;

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        <span className={styles.searchWrap}>
          <span className={styles.searchGlyph} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 8l2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <Input
            className={styles.searchInput}
            placeholder="Search name, alt, credit, tags"
            aria-label="Search media"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </span>

        <span className={styles.pills} role="group" aria-label="Filter by kind">
          {KIND_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={filters.kind === t.value}
              className={`${styles.pill} ${filters.kind === t.value ? styles.pillActive : ""}`}
              onClick={() => set({ kind: t.value })}
            >
              {t.label}
            </button>
          ))}
        </span>

        <button
          type="button"
          aria-pressed={filters.needsAlt}
          className={`${styles.chip} ${filters.needsAlt ? styles.chipActive : ""}`}
          onClick={() => set({ needsAlt: !filters.needsAlt })}
        >
          Needs alt
        </button>
        <button
          type="button"
          aria-pressed={filters.needsCredit}
          className={`${styles.chip} ${filters.needsCredit ? styles.chipActive : ""}`}
          onClick={() => set({ needsCredit: !filters.needsCredit })}
        >
          Needs credit
        </button>
      </div>

      {(tags.length > 0 || active) && (
        <div className={styles.tagRow}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={filters.tags.includes(tag)}
              className={`${styles.tag} ${filters.tags.includes(tag) ? styles.tagActive : ""}`}
              onClick={() => set({ tags: toggleInList(filters.tags, tag) })}
            >
              {tag}
            </button>
          ))}
          {active && (
            <button type="button" className={styles.clearLink} onClick={() => onChange(EMPTY_FILTERS)}>
              Clear
            </button>
          )}
        </div>
      )}

      <span className={styles.summary}>
        {visible.length} asset{visible.length === 1 ? "" : "s"} of {total} · {missingCredit} missing
        credit
      </span>
    </div>
  );
}
