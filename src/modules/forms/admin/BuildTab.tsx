"use client";

import type { Editor } from "./FormBuilder";
import { FieldPalette } from "./FieldPalette";
import { FieldEditor } from "./FieldEditor";
import { QuizLogicPanel } from "./QuizLogicPanel";
import { FormPreview } from "./FormPreview";
import styles from "./forms.module.css";

/**
 * Build tab — field list + palette on the left, a LIVE preview on the right.
 * For quiz forms, the quiz logic panel (score/outcome mode + outcomes) sits
 * above the fields; per-answer points are edited on each field.
 */
export function BuildTab({ editor, paymentsEnabled }: { editor: Editor; paymentsEnabled: boolean }) {
  const isQuiz = editor.draft.type === "quiz";

  return (
    <div className={styles.buildGrid}>
      <div className={styles.fieldList}>
        {isQuiz ? <QuizLogicPanel editor={editor} /> : null}
        {editor.draft.fields.length === 0 ? (
          <p className={styles.empty}>Add a field from the palette to begin.</p>
        ) : (
          editor.draft.fields.map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              isQuiz={isQuiz}
              onChange={(p) => editor.updateField(field.id, p)}
              onRemove={() => editor.removeField(field.id)}
              onMove={(dir) => editor.moveField(field.id, dir)}
            />
          ))
        )}
        <FieldPalette onAdd={editor.addField} />
      </div>
      <FormPreview editor={editor} paymentsEnabled={paymentsEnabled} />
    </div>
  );
}
