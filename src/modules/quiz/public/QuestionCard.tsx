"use client";

import type { QuizQuestion } from "../logic";
import styles from "./quiz.module.css";

/**
 * One question with its options as selectable buttons. Presentation only —
 * selection state and scoring live in the parent QuizClient (which shares the
 * single pure scorer across all three interaction styles).
 */
export function QuestionCard({
  question,
  selected,
  onSelect,
  showProgress,
}: {
  question: QuizQuestion;
  selected: string | undefined;
  onSelect: (value: string) => void;
  showProgress?: string;
}) {
  return (
    <div className={styles.question}>
      {showProgress ? <div className={styles.progress}>{showProgress}</div> : null}
      <h2 className={styles.prompt}>{question.prompt}</h2>
      {question.help ? <p className={styles.help}>{question.help}</p> : null}
      <div className={styles.options} role="radiogroup" aria-label={question.prompt}>
        {question.options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value || "none"}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.option} ${active ? styles.optionActive : ""}`}
              onClick={() => onSelect(opt.value)}
            >
              <span className={styles.optionMark} aria-hidden />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
