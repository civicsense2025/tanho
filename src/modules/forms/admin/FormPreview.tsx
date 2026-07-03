"use client";

import type { Editor } from "./FormBuilder";
import { FieldControl } from "../public/FieldControl";
import { isScreen } from "../field-kinds";
import styles from "./forms.module.css";

/**
 * Live form preview — renders the draft's fields exactly as a visitor sees them
 * (reusing the public FieldControl), updating as the builder changes. It's
 * read-only: no submit, no honeypot — just the rendered form so the author can
 * see their work. Payment fields gate on `paymentsEnabled` (passed from server).
 */
export function FormPreview({ editor, paymentsEnabled }: { editor: Editor; paymentsEnabled: boolean }) {
  const { name, fields } = editor.draft;
  const inputs = fields.filter((f) => !isScreen(f.kind));

  return (
    <aside className={styles.previewPane}>
      <div className={styles.previewLabel}>Preview</div>
      <div className={styles.previewCard}>
        <h2 className={styles.previewTitle}>{name || "Untitled form"}</h2>
        {fields.length === 0 ? (
          <p className={styles.empty}>Fields you add appear here.</p>
        ) : (
          <div className={styles.previewFields}>
            {fields.map((f) => (
              <FieldControl key={f.id} field={f} paymentsEnabled={paymentsEnabled} />
            ))}
            {inputs.length > 0 ? (
              <button type="button" disabled className={styles.previewSubmit}>
                {editor.draft.settings.submitLabel || "Submit"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
