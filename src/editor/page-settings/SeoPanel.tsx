"use client";

import { useState } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import type { PageDraft, PatchPage } from "./types";
import styles from "./page-settings.module.css";

/**
 * Collapsible SEO + indexing controls — the design's SeoPanel. Title/description
 * fall back to the page title + first paragraph server-side when blank, so these
 * are overrides. noIndex flips the page to dynamic robots handling.
 */
export function SeoPanel({
  page,
  patchPage,
}: {
  page: PageDraft;
  patchPage: PatchPage;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.panelToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>SEO &amp; indexing</span>
        <span className={styles.chevron} data-open={open || undefined}>
          ▾
        </span>
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", paddingTop: "var(--space-4)" }}>
          <Field label="Meta title" hint={`${page.seoTitle.length}/60 · blank = page title`}>
            <Input
              value={page.seoTitle}
              maxLength={200}
              onChange={(e) => patchPage({ seoTitle: e.target.value })}
              placeholder={page.title}
            />
          </Field>
          <Field label="Meta description" hint={`${page.seoDescription.length}/160`}>
            <Textarea
              value={page.seoDescription}
              maxLength={400}
              rows={3}
              onChange={(e) => patchPage({ seoDescription: e.target.value })}
              placeholder="A short summary for search + social cards."
            />
          </Field>
          <Field label="Canonical URL" hint="Optional — point duplicates at the original">
            <Input
              value={page.canonicalUrl}
              onChange={(e) => patchPage({ canonicalUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={page.noIndex}
              onChange={(e) => patchPage({ noIndex: e.target.checked })}
            />
            <span>
              <strong>Hide from search engines</strong>
              <span className={styles.checkHint}>Adds noindex; drops it from the sitemap.</span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
