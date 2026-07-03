"use client";

import { Button } from "@/components/core/Button";
import { QUIZ_QUESTIONS, type QuizAnswers } from "../logic";
import { QuestionCard } from "./QuestionCard";
import styles from "./quiz.module.css";

/**
 * Split (two-pane) style: a sticky progress/summary pane beside the current
 * question. Navigation and answers are owned by the parent QuizClient, so this
 * shares the one scorer with the wizard and scroll styles.
 */
export function SplitStyle({
  step,
  answers,
  onSelect,
  onBack,
  onNext,
  onFinish,
}: {
  step: number;
  answers: QuizAnswers;
  onSelect: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const q = QUIZ_QUESTIONS[step];
  const isLast = step === QUIZ_QUESTIONS.length - 1;
  const answered = answers[q.id] !== undefined;
  const answeredCount = QUIZ_QUESTIONS.filter((qq) => answers[qq.id] !== undefined).length;

  return (
    <div className={styles.split}>
      <aside className={styles.splitAside}>
        <div className={styles.progress}>
          Step {step + 1} / {QUIZ_QUESTIONS.length}
        </div>
        <p className={styles.ledeBody}>
          Answer honestly — the result recommends guides matched to your comfort,
          budget, and time. {answeredCount} of {QUIZ_QUESTIONS.length} answered.
        </p>
      </aside>

      <div>
        <QuestionCard question={q} selected={answers[q.id]} onSelect={onSelect} />
        <div className={styles.controls}>
          <Button variant="ghost" onClick={onBack} disabled={step === 0}>
            ← Back
          </Button>
          <span className={styles.spacer} />
          <Button
            variant="accent"
            onClick={isLast ? onFinish : onNext}
            disabled={!answered}
          >
            {isLast ? "See result" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
