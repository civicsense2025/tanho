"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  listImageMediaAction,
  listPublicAssetsAction,
  uploadMedia,
  uploadToPublicAction,
  type PickerItem,
} from "../actions";
import { UPLOAD_ACCEPT } from "../validation";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import styles from "./sheet.module.css";

type Source = "uploads" | "public";

/**
 * The shared image-media chooser modal used by both MediaPicker (returns a URL)
 * and MediaIdPicker (returns {id,url}). Fetches image-kind media (incl.
 * sanitized SVGs), supports search + inline upload, and returns the picked item.
 *
 * `allowPublic` adds a second source: the app's `/public` folder (a self-
 * hoster's own static assets, served at their own URL with no DB row). It's on
 * by default for URL-based fields; MediaIdPicker turns it OFF, because a
 * /public asset has no media-row id to store.
 */
export function MediaPickerModal({
  onPick,
  onClose,
  allowPublic = true,
}: {
  onPick: (item: PickerItem) => void;
  onClose: () => void;
  allowPublic?: boolean;
}) {
  const [source, setSource] = useState<Source>("uploads");
  const [loaded, setLoaded] = useState<{
    items: PickerItem[];
    source: Source;
    key: number;
  } | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Load the active source's items (re-run on source change or after an upload).
  // `items` is derived: null (loading) when the current source/key doesn't match
  // the last loaded batch, the array once the fetch for the current params resolves.
  useEffect(() => {
    let alive = true;
    const load = source === "public" ? listPublicAssetsAction : listImageMediaAction;
    void load().then((res) => {
      if (alive)
        setLoaded({ items: res.ok ? (res.data ?? []) : [], source, key: reloadKey });
    });
    return () => {
      alive = false;
    };
  }, [source, reloadKey]);

  const items =
    loaded?.source === source && loaded?.key === reloadKey ? loaded.items : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onUpload = (file: File) => {
    setErr(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.set("file", file);
      if (source === "public") {
        const res = await uploadToPublicAction(fd);
        if (!res.ok) return setErr(res.error);
        setReloadKey((k) => k + 1);
        onPick({ id: res.data!.url, name: res.data!.url, alt: "", url: res.data!.url });
      } else {
        const res = await uploadMedia(fd);
        if (!res.ok) return setErr(res.error);
        setReloadKey((k) => k + 1);
        const row = res.data!;
        onPick({ id: row.id, name: row.name, alt: row.alt, url: `/api/media/${row.storageKey}` });
      }
    });
  };

  const needle = q.trim().toLowerCase();
  const visible = (items ?? []).filter(
    (i) => !needle || `${i.name} ${i.alt}`.toLowerCase().includes(needle),
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a file"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>Choose a file</h3>
          <span style={{ flex: 1 }} />
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {allowPublic ? (
          <>
            <div className={styles.segRow} role="tablist" aria-label="File source">
              <button
                type="button"
                role="tab"
                aria-selected={source === "uploads"}
                className={source === "uploads" ? styles.segOn : styles.segBtn}
                onClick={() => setSource("uploads")}
              >
                Uploads
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source === "public"}
                className={source === "public" ? styles.segOn : styles.segBtn}
                onClick={() => setSource("public")}
              >
                Public folder
              </button>
            </div>
            <p className={styles.pickerHint}>
              {source === "public"
                ? "Files in your public/ folder — served statically (fast, no database) at their own URL."
                : "Uploaded media — stored and served via /api/media (cached)."}
            </p>
          </>
        ) : null}

        <div className={styles.pickerToolbar}>
          <Input
            placeholder="Search files"
            aria-label="Search files"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : source === "public" ? "Upload to public/" : "Upload"}
          </Button>
        </div>
        {err ? <p className={styles.pickerError}>{err}</p> : null}

        {items === null ? (
          <p className={styles.pickerEmpty}>Loading files…</p>
        ) : visible.length === 0 ? (
          <p className={styles.pickerEmpty}>
            {items.length === 0
              ? source === "public"
                ? "No files in your public/ folder yet."
                : "No uploads yet — add one above."
              : "Nothing matches this search."}
          </p>
        ) : (
          <div className={styles.pickerGrid}>
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.pickerItem}
                onClick={() => onPick(item)}
                title={item.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- picker thumb; served from our media route */}
                <img src={item.url} alt={item.alt || item.name} loading="lazy" className={styles.pickerImg} />
                <span className={styles.pickerName}>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
