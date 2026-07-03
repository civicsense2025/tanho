"use client";

import Link from "next/link";
import type { MediaUsageRef } from "../queries";
import styles from "./sheet.module.css";

/**
 * "Used in" — every place the published site references this asset.
 * Page owners link to their editor; other owner types render as plain
 * rows with their route.
 */
export function UsedInSection({ usage }: { usage: MediaUsageRef[] }) {
  return (
    <>
      <h3 className={styles.sectionTitle}>
        Used in <span className={styles.countPill}>{usage.length}</span>
      </h3>
      {usage.length === 0 ? (
        <p className={styles.emptyUsed} style={{ margin: 0 }}>
          Not used anywhere yet. Safe to delete — nothing on the site links to this file.
        </p>
      ) : (
        <div className={styles.usedList}>
          {usage.map((u) => {
            const inner = (
              <>
                <span className={styles.ownerType}>{u.ownerType}</span>
                <span className={styles.usedTitle}>{u.title}</span>
                <span className={styles.usedWhere}>{u.whereLabel}</span>
                <span className={styles.arrow} aria-hidden>
                  →
                </span>
              </>
            );
            const key = `${u.ownerType}:${u.ownerId}:${u.whereLabel}`;
            return u.ownerType === "page" ? (
              <Link key={key} href={`/admin/pages/${u.ownerId}`} className={styles.usedRow}>
                {inner}
              </Link>
            ) : (
              <span key={key} className={styles.usedRow}>
                {inner}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
}
