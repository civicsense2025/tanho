"use client";

import { Button } from "@/components/core/Button";
import { QUIZ_QUESTIONS, type QuizAnswers } from "../logic";
import { QuestionCard } from "./QuestionCard";
import styles from "./quiz.module.css";

/**
 * Scroll style: every question stacked in one long page, then a single "See
 * result" action once all are answered. Same answer state and scorer as the
 * other styles — only the layout differs.
 */
export function ScrollStyle({
  answers,
  onSelect,
  onFinish,
}: {
  answers: QuizAnswers;
  onSelect: (id: (typeof QUIZ_QUESTIONS)[number]["id"], value: string) => void;
  onFinish: () => void;
}) {
  const allAnswered = QUIZ_QUESTIONS.every((q) => answers[q.id] !== undefined);
  const answeredCount = QUIZ_QUESTIONS.filter((q) => answers[q.id] !== undefined).length;

  return (
    <div>
      {QUIZ_QUESTIONS.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          selected={answers[q.id]}
          onSelect={(value) => onSelect(q.id, value)}
          showProgress={`Question ${i + 1} of ${QUIZ_QUESTIONS.length}`}
        />
      ))}
      <div className={styles.controls}>
        <span className={styles.progress}>
          {answeredCount} of {QUIZ_QUESTIONS.length} answered
        </span>
        <span className={styles.spacer} />
        <Button variant="accent" onClick={onFinish} disabled={!allAnswered}>
          See result
        </Button>
      </div>
    </div>
  );
}
