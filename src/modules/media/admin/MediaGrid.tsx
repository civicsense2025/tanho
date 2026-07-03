"use client";

import type { MediaWithUsage } from "../queries";
import { Button } from "@/components/core/Button";
import { MediaCard } from "./MediaCard";
import styles from "./media.module.css";

/** Responsive auto-fill card grid with filtered/empty states. */
export function MediaGrid({
  items,
  filtered,
  onOpen,
  onClear,
  onSaved,
}: {
  items: MediaWithUsage[];
  filtered: boolean;
  onOpen: (id: string) => void;
  onClear: () => void;
  onSaved: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        {filtered ? (
          <>
            <p style={{ margin: 0 }}>Nothing matches these filters.</p>
            <Button variant="outline" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          </>
        ) : (
          <p style={{ margin: 0 }}>
            No media yet. Upload images, video or documents to reuse them across the site.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <MediaCard key={item.id} item={item} onOpen={() => onOpen(item.id)} onSaved={onSaved} />
      ))}
    </div>
  );
}
