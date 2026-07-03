"use client";

import styles from "./EntityList.module.css";

/** Search box + progressive status filter + count line for EntityList. */
export function EntityListToolbar({
  noun,
  count,
  q,
  onQ,
  statuses,
  status,
  onStatus,
  showFilter,
  onToggleFilter,
}: {
  noun: string;
  count: number;
  q: string;
  onQ: (v: string) => void;
  statuses: string[];
  status: string | null;
  onStatus: (v: string | null) => void;
  showFilter: boolean;
  onToggleFilter: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        type="search"
        placeholder={`Search ${noun}…`}
        value={q}
        onChange={(e) => onQ(e.target.value)}
      />
      {statuses.length > 0 ? (
        <div className={styles.filterZone}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-expanded={showFilter}
            aria-pressed={status !== null}
            onClick={onToggleFilter}
            title="Filter by status"
          >
            ▾ {status ?? "Status"}
          </button>
          {showFilter ? (
            <div className={styles.filterMenu} role="menu">
              <button
                type="button"
                className={styles.filterOpt}
                onClick={() => onStatus(null)}
              >
                All
              </button>
              {statuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.filterOpt}
                  onClick={() => onStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <span className={styles.count}>
        {count} {noun}
      </span>
    </div>
  );
}
