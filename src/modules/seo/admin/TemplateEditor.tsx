"use client";

import { applyTemplate } from "../templating";
import type { SeoTemplate } from "../validation";
import { Input } from "@/components/forms/Input";
import { Field } from "@/components/forms/Field";
import styles from "./seo.module.css";

const TOKENS = ["{title}", "{excerpt}", "{tag}", "{site}"] as const;

/** Sample values that make the live preview legible. */
const SAMPLE = { title: "Sample entry", excerpt: "A short summary of this entry.", tag: "Design" };

/** Title/description template pair for one content type, with token chips + preview.
 *  When `disabled` (the content type is turned off in Content types), the
 *  block renders locked — a lock icon + reduced opacity — since the template
 *  has no effect until the type is re-enabled. Fields stay editable so the
 *  owner can still prep the template ahead of turning it back on. */
export function TemplateEditor({
  type,
  value,
  siteName,
  onChange,
  disabled = false,
}: {
  type: string;
  value: SeoTemplate;
  siteName: string;
  onChange: (next: SeoTemplate) => void;
  disabled?: boolean;
}) {
  const tokens = { ...SAMPLE, site: siteName };
  const titlePreview = applyTemplate(value.title, tokens);
  const descPreview = applyTemplate(value.description, tokens);

  const insert = (field: "title" | "description", token: string) =>
    onChange({ ...value, [field]: `${value[field]}${token}` });

  return (
    <div className={`${styles.typeBlock} ${disabled ? styles.typeBlockDisabled : ""}`}>
      <span className={styles.typeName}>
        {type}
        {disabled ? (
          <span className={styles.lockBadge} title={`"${type}" is turned off in Content types — this template has no effect until it's re-enabled.`}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Off
          </span>
        ) : null}
      </span>

      <Field label="Title template">
        <Input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
        <div className={styles.chips}>
          {TOKENS.map((t) => (
            <button key={t} type="button" className={styles.chip} onClick={() => insert("title", t)}>
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Description template">
        <Input
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
        <div className={styles.chips}>
          {TOKENS.map((t) => (
            <button
              key={t}
              type="button"
              className={styles.chip}
              onClick={() => insert("description", t)}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <div className={styles.preview}>
        <span className={styles.previewKind}>Search preview</span>
        <span className={styles.previewTitle}>{titlePreview || "Untitled"}</span>
        <span className={styles.previewDesc}>{descPreview}</span>
        <span
          className={`${styles.count} ${titlePreview.length > 60 ? styles.countOver : ""}`}
        >
          title {titlePreview.length}/60 · description {descPreview.length}/160
        </span>
      </div>
    </div>
  );
}
