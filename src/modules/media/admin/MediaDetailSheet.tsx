"use client";

import { useEffect, useState, useTransition } from "react";
import type { MediaWithUsage } from "../queries";
import { deleteMedia, updateMedia } from "../actions";
import { Button } from "@/components/core/Button";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { suggestAltTextAction } from "@/modules/ai-crawlers/authoring-actions";
import { AttributionSection } from "./AttributionSection";
import { UsedInSection } from "./UsedInSection";
import { mediaUrl, metaLine } from "./format";
import styles from "./sheet.module.css";

/**
 * Detail sidesheet — fixed right panel (min(460px, 100%)). Closes via the
 * overlay, Escape, the ✕ button, or Done. Fields save on blur.
 */
export function MediaDetailSheet({
  item,
  onClose,
  onSaved,
  aiAltEnabled = false,
}: {
  item: MediaWithUsage;
  onClose: () => void;
  onSaved: () => void;
  aiAltEnabled?: boolean;
}) {
  const [aiError, setAiError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url = mediaUrl(item.storageKey);

  const saveAlt = (value: string) => {
    if (value === item.alt) return;
    void updateMedia(item.id, { alt: value }).then(onSaved);
  };

  const suggestAlt = () =>
    startSuggest(async () => {
      setAiError(null);
      const context = item.name || url;
      const res = await suggestAltTextAction(context);
      if (res.ok) saveAlt(res.data);
      else setAiError(res.message);
    });

  const remove = () => {
    const n = item.usage.length;
    const message =
      n > 0
        ? `This asset is used in ${n} place${n === 1 ? "" : "s"} on the site. Delete anyway?`
        : `Delete "${item.name}"? This cannot be undone.`;
    if (!window.confirm(message)) return;
    void deleteMedia(item.id).then((res) => {
      if (res.ok) {
        onClose();
        onSaved();
      }
    });
  };

  return (
    <>
      <button type="button" className={styles.overlay} aria-label="Close details" onClick={onClose} />
      <aside className={styles.sheet} role="dialog" aria-modal="true" aria-label={item.name}>
        <div className={styles.sheetHead}>
          <span className={styles.eyebrow}>Media details</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.preview}>
          {item.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- author media has unknown dimensions; next/image needs sizing + loader config
            <img src={url} alt={item.alt || item.name} className={styles.previewImg} />
          ) : item.kind === "video" ? (
            <video src={url} controls preload="metadata" className={styles.previewVideo} />
          ) : (
            <span className={styles.stripes} aria-hidden>
              <span className={styles.eyebrow}>
                {item.storageKey.split(".").pop()?.toUpperCase()}
              </span>
            </span>
          )}
        </div>

        <div className={styles.nameRow}>
          <span className={styles.fileName}>{item.name}</span>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            Replace
          </Button>
        </div>
        <span className={styles.metaLine}>
          {metaLine(item)} · {item.mime}
        </span>

        <Field label="Alt text" hint="Describes the image for screen readers and search.">
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Input
              key={`alt:${item.alt}`}
              defaultValue={item.alt}
              placeholder="What does this show?"
              maxLength={300}
              onBlur={(e) => saveAlt(e.target.value)}
            />
            {item.kind === "image" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={suggestAlt}
                loading={suggesting}
                disabled={!aiAltEnabled}
                title={aiAltEnabled ? "Suggest alt text with AI" : "Connect an AI provider to use this"}
              >
                AI suggest
              </Button>
            ) : null}
          </div>
          {aiError ? <span className={styles.flash}>{aiError}</span> : null}
        </Field>

        <AttributionSection item={item} onSaved={onSaved} />
        <UsedInSection usage={item.usage} />

        <div className={styles.dangerRow}>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "var(--danger)" }}
            onClick={remove}
          >
            Delete asset
          </Button>
          <span style={{ flex: 1 }} />
          <Button variant="accent" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </aside>
    </>
  );
}
