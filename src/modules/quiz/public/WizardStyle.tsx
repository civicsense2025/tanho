"use client";

import { Button } from "@/components/core/Button";
import { QUIZ_QUESTIONS, type QuizAnswers } from "../logic";
import { QuestionCard } from "./QuestionCard";
import styles from "./quiz.module.css";

/**
 * Wizard style: one question per screen with Back/Next. `step` and navigation
 * are owned by the parent QuizClient so all styles share the same answer state
 * and the same scorer.
 */
export function WizardStyle({
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

  return (
    <div>
      <QuestionCard
        question={q}
        selected={answers[q.id]}
        onSelect={onSelect}
        showProgress={`Question ${step + 1} of ${QUIZ_QUESTIONS.length}`}
      />
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
  );
}
