"use client";

import type { Editor } from "./FormBuilder";
import type { QuizConfig } from "../validation";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import styles from "./forms.module.css";

const DEFAULT: QuizConfig = { mode: "score", outcomes: [] };
const uid = () => `o_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Quiz logic — the design's quiz panel. Score mode grades on the per-field
 * `points` (edited in each field) with a pass mark; Outcome mode maps a total
 * score to a named result (each outcome has a `min` threshold + message). Points
 * are set per-answer in the field editor; this panel owns the mode + outcomes.
 */
export function QuizLogicPanel({ editor }: { editor: Editor }) {
  const quiz = editor.draft.quiz ?? DEFAULT;
  const setQuiz = (next: QuizConfig) => editor.patch({ quiz: next });

  const setMode = (mode: QuizConfig["mode"]) => setQuiz({ ...quiz, mode });
  const addOutcome = () =>
    setQuiz({ ...quiz, outcomes: [...quiz.outcomes, { id: uid(), label: "", min: 0, message: "" }] });
  const updateOutcome = (i: number, patch: Partial<QuizConfig["outcomes"][number]>) =>
    setQuiz({ ...quiz, outcomes: quiz.outcomes.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const removeOutcome = (i: number) =>
    setQuiz({ ...quiz, outcomes: quiz.outcomes.filter((_, j) => j !== i) });

  return (
    <section className={styles.quizPanel}>
      <h3 className={styles.quizHead}>Quiz logic</h3>
      <div className={styles.modeRow}>
        {(["score", "outcome"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={quiz.mode === m ? styles.modeBtnActive : styles.modeBtn}
          >
            {m === "score" ? "Score" : "Outcome"}
          </button>
        ))}
      </div>
      <p className={styles.quizHint}>
        {quiz.mode === "score"
          ? "Grade by total points (set points per answer on each field). Set a pass mark in Settings."
          : "Map the total score to a named result — each outcome shows its message when the score reaches its threshold."}
      </p>

      {quiz.mode === "outcome" ? (
        <div className={styles.outcomeList}>
          {quiz.outcomes.map((o, i) => (
            <div key={o.id} className={styles.outcomeRow}>
              <Input
                value={o.label}
                placeholder="Outcome name (e.g. Ready to launch)"
                onChange={(e) => updateOutcome(i, { label: e.target.value })}
              />
              <Input
                type="number"
                value={o.min}
                aria-label="Minimum score"
                style={{ width: 90 }}
                onChange={(e) => updateOutcome(i, { min: Number(e.target.value) || 0 })}
              />
              <Textarea
                rows={2}
                value={o.message}
                placeholder="Message shown for this outcome"
                onChange={(e) => updateOutcome(i, { message: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={() => removeOutcome(i)}>✕</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOutcome}>+ Add outcome</Button>
        </div>
      ) : null}
    </section>
  );
}
