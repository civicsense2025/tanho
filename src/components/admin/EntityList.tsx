"use client";

import { useMemo, useState, type ReactNode } from "react";
import styles from "./EntityList.module.css";
import { StatusChip } from "./StatusChip";
import { EntityListToolbar } from "./EntityListToolbar";

export { StatusChip };

export type EntityListColumn<T> = {
  key: string;
  header: string;
  width?: string;
  align?: "start" | "end";
  render: (item: T) => ReactNode;
};

export type BulkAction<T> = {
  label: string;
  onAction: (ids: string[], items: T[]) => void;
  tone?: "default" | "danger";
};

export type EntityListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  columns: EntityListColumn<T>[];
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string | undefined;
  getLead?: (item: T) => string | undefined;
  getStatus?: (item: T) => string | undefined;
  /** Keys/getters searched by the search box. */
  searchValues: (item: T) => string[];
  /** Distinct status values for the filter (derived if omitted). */
  editHref?: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  emptyLabel: string;
  noun: string;
};

const PAGE = 20;

/**
 * Reusable admin list shell — search, status filter, count line, multi-select
 * with a bulk bar, and 20-row pagination. One grid per row; the header hides
 * and rows stack below 720px (see the CSS module).
 */
export function EntityList<T>(props: EntityListProps<T>) {
  const {
    items,
    getId,
    columns,
    getTitle,
    getSubtitle,
    getLead,
    getStatus,
    searchValues,
    editHref,
    onRowClick,
    selectable = false,
    bulkActions = [],
    emptyLabel,
    noun,
  } = props;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const statuses = useMemo(() => {
    if (!getStatus) return [];
    return [...new Set(items.map((i) => getStatus(i)).filter(Boolean) as string[])];
  }, [items, getStatus]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (status && getStatus?.(i) !== status) return false;
      if (!needle) return true;
      return searchValues(i).some((v) => v.toLowerCase().includes(needle));
    });
  }, [items, q, status, getStatus, searchValues]);

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;

  const allVisibleSelected =
    visible.length > 0 && visible.every((i) => selected.has(getId(i)));
  const someSelected = visible.some((i) => selected.has(getId(i)));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((i) => next.delete(getId(i)));
      else visible.forEach((i) => next.add(getId(i)));
      return next;
    });
  };

  const selectedItems = filtered.filter((i) => selected.has(getId(i)));

  const gridTemplate = [
    selectable ? "auto" : null,
    "minmax(0,2.2fr)",
    ...columns.map((c) => c.width ?? "1fr"),
    editHref ? "auto" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrap}>
      <EntityListToolbar
        noun={noun}
        count={filtered.length}
        q={q}
        onQ={(v) => {
          setQ(v);
          setShown(PAGE);
        }}
        statuses={statuses}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setShowFilter(false);
          setShown(PAGE);
        }}
        showFilter={showFilter}
        onToggleFilter={() => setShowFilter((v) => !v)}
      />

      {selectable && selectedItems.length > 0 ? (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedItems.length} selected</span>
          <span style={{ flex: 1 }} />
          {bulkActions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={a.tone === "danger" ? styles.bulkDanger : styles.bulkBtn}
              onClick={() => {
                a.onAction(
                  selectedItems.map((i) => getId(i)),
                  selectedItems,
                );
                setSelected(new Set());
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className={styles.empty}>{emptyLabel}</div>
      ) : (
        <div className={styles.table}>
          <div
            className={styles.head}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {selectable ? (
              <span className={styles.cell}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allVisibleSelected;
                  }}
                  onChange={toggleAll}
                />
              </span>
            ) : null}
            <span className={styles.headCell}>{noun}</span>
            {columns.map((c) => (
              <span
                key={c.key}
                className={styles.headCell}
                style={{ textAlign: c.align === "end" ? "end" : "start" }}
              >
                {c.header}
              </span>
            ))}
            {editHref ? <span className={styles.headCell} /> : null}
          </div>

          {visible.map((item) => {
            const id = getId(item);
            const st = getStatus?.(item);
            return (
              <div
                key={id}
                className={styles.row}
                style={{ gridTemplateColumns: gridTemplate }}
                data-clickable={onRowClick ? "" : undefined}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {selectable ? (
                  <span
                    className={styles.cell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${getTitle(item)}`}
                      checked={selected.has(id)}
                      onChange={() => toggle(id)}
                    />
                  </span>
                ) : null}
                <span className={styles.titleCell}>
                  <span className={styles.title}>{getTitle(item)}</span>
                  {getSubtitle?.(item) ? (
                    <span className={styles.subtitle}>{getSubtitle(item)}</span>
                  ) : null}
                  {getLead?.(item) ? (
                    <span className={styles.lead}>{getLead(item)}</span>
                  ) : null}
                </span>
                {columns.map((c) => (
                  <span
                    key={c.key}
                    className={styles.cell}
                    data-label={c.header}
                    style={{ justifyContent: c.align === "end" ? "flex-end" : "flex-start" }}
                  >
                    {c.key === "__status" && st ? (
                      <StatusChip status={st} />
                    ) : (
                      c.render(item)
                    )}
                  </span>
                ))}
                {editHref ? (
                  <span className={styles.cell}>
                    <a
                      className={styles.editLink}
                      href={editHref(item)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit →
                    </a>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {remaining > 0 ? (
        <button
          type="button"
          className={styles.loadMore}
          onClick={() => setShown((n) => n + PAGE)}
        >
          Load {Math.min(PAGE, remaining)} more · {remaining} remaining
        </button>
      ) : null}
    </div>
  );
}
