"use client";

import { useState } from "react";
import { Field } from "@/components/forms/Field";
import { Textarea } from "@/components/forms/Textarea";
import type { PageDraft, PatchPage } from "./types";
import styles from "./page-settings.module.css";

/**
 * Per-page custom code. Two trust tiers:
 *  - **Custom CSS** — available to ANY admin; sanitised on save + render (scoped to
 *    the page's `.pb-custom-scope`, allow-listed, no scripts). Safe by construction.
 *  - **Head / Body code** — OWNER-ONLY, rendered VERBATIM (real <script> for analytics,
 *    pixels, embeds). The `savePageDetails` action is the authoritative gate: it strips
 *    these fields from a non-owner's payload regardless of what the client sends. When
 *    `isOwner` is false we simply don't render the inputs (and the server enforces it).
 */
export function CustomCodePanel({
  page,
  patchPage,
  isOwner,
}: {
  page: PageDraft;
  patchPage: PatchPage;
  isOwner: boolean;
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
        <span>Custom code</span>
        <span className={styles.chevron} data-open={open || undefined}>
          ▾
        </span>
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", paddingTop: "var(--space-4)" }}>
          <Field
            label="Custom CSS"
            hint="Sanitised & scoped to this page. Target blocks via [data-block] or a block's class."
          >
            <Textarea
              value={page.customCss}
              maxLength={50000}
              rows={6}
              spellCheck={false}
              onChange={(e) => patchPage({ customCss: e.target.value })}
              placeholder={`.pb-custom-scope [data-block="heading"] { letter-spacing: .02em }`}
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
            />
          </Field>

          {isOwner ? (
            <>
              <p
                role="note"
                style={{
                  margin: 0,
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text)",
                  background: "var(--accent-2-tint)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <strong>⚠ Owner-only, runs verbatim.</strong> This code is injected exactly as
                written and is <strong>not sanitised</strong> — a bad snippet can break the page or
                leak data. Use it for trusted analytics, pixels, and embeds.
              </p>
              <Field label="Head code" hint="Injected on this page — analytics, meta tags, verification.">
                <Textarea
                  value={page.customHeadHtml}
                  maxLength={50000}
                  rows={5}
                  spellCheck={false}
                  onChange={(e) => patchPage({ customHeadHtml: e.target.value })}
                  placeholder={`<script>/* analytics */</script>`}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
                />
              </Field>
              <Field label="Body code" hint="Injected at the end of the page — chat widgets, embeds.">
                <Textarea
                  value={page.customBodyHtml}
                  maxLength={50000}
                  rows={5}
                  spellCheck={false}
                  onChange={(e) => patchPage({ customBodyHtml: e.target.value })}
                  placeholder={`<script src="/widget.js" defer></script>`}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
                />
              </Field>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
              Adding custom <code>&lt;script&gt;</code> / head &amp; body code requires the{" "}
              <strong>owner</strong> role.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
