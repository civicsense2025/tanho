"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaWithUsage } from "../queries";
import { needsAlt, needsCredit } from "../licenses";
import { uploadMedia } from "../actions";
import { Button } from "@/components/core/Button";
import { applyFilters, anyFilterActive, EMPTY_FILTERS, tagUnion, type FiltersState } from "./filtering";
import { MediaToolbar } from "./MediaToolbar";
import { MediaGrid } from "./MediaGrid";
import { MediaDetailSheet } from "./MediaDetailSheet";
import styles from "./media.module.css";

/** The Media library screen — state owner for filters, upload, and the
 *  detail sidesheet. Data arrives from the server page and is refreshed
 *  via router.refresh() after every mutation. */
export function MediaLibrary({
  initial,
  accept,
  aiAltEnabled = false,
}: {
  initial: MediaWithUsage[];
  accept: string;
  aiAltEnabled?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  const visible = useMemo(() => applyFilters(initial, filters), [initial, filters]);
  const tags = useMemo(() => tagUnion(initial), [initial]);
  const altCount = initial.filter(needsAlt).length;
  const creditCount = initial.filter(needsCredit).length;
  const selected = selectedId ? initial.find((m) => m.id === selectedId) ?? null : null;
  const refresh = () => router.refresh();

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadMedia(fd);
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        refresh();
      }
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Media library</h1>
        <span style={{ flex: 1 }} />
        {error && <span className={styles.flash}>{error}</span>}
        <Button
          variant="accent"
          size="sm"
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          + Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <p className={styles.intro}>
        Every image, video and document on the site, with the licensing and accessibility details
        that keep publishing safe.
        {altCount > 0 && (
          <>
            {" "}
            <button
              type="button"
              className={styles.shortcut}
              onClick={() => setFilters({ ...EMPTY_FILTERS, needsAlt: true })}
            >
              {altCount} need{altCount === 1 ? "s" : ""} alt text
            </button>
            .
          </>
        )}
        {creditCount > 0 && (
          <>
            {" "}
            <button
              type="button"
              className={styles.shortcut}
              onClick={() => setFilters({ ...EMPTY_FILTERS, needsCredit: true })}
            >
              {creditCount} need{creditCount === 1 ? "s" : ""} a credit
            </button>
            .
          </>
        )}
      </p>

      <MediaToolbar
        filters={filters}
        onChange={setFilters}
        tags={tags}
        total={initial.length}
        visible={visible}
      />
      <MediaGrid
        items={visible}
        filtered={anyFilterActive(filters)}
        onOpen={setSelectedId}
        onClear={() => setFilters(EMPTY_FILTERS)}
        onSaved={refresh}
      />

      {selected && (
        <MediaDetailSheet
          item={selected}
          onClose={() => setSelectedId(null)}
          onSaved={refresh}
          aiAltEnabled={aiAltEnabled}
        />
      )}
    </main>
  );
}
