"use client";

import { useMemo, useState } from "react";
import type { EntryRow } from "@/modules/entries/schema";
import {
  computeResult,
  QUIZ_QUESTIONS,
  type QuizAnswers,
  type QuizQuestionId,
} from "../logic";
import { WizardStyle } from "./WizardStyle";
import { ScrollStyle } from "./ScrollStyle";
import { SplitStyle } from "./SplitStyle";
import { ResultView } from "./ResultView";
import styles from "./quiz.module.css";

export type QuizStyle = "wizard" | "scroll" | "split";

/**
 * The quiz island. Owns the single answer state and drives the ONE shared
 * scorer (computeResult) — the three visual styles are pure layout over the
 * same state. Guides are fetched server-side and passed in, so this stays a
 * self-contained client component with no data fetching.
 */
export function QuizClient({
  guides,
  style = "wizard",
  title,
  intro,
}: {
  guides: EntryRow[];
  style?: QuizStyle;
  title: string;
  intro: string;
}) {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);

  const result = useMemo(
    () => (finished ? computeResult(answers, guides) : null),
    [finished, answers, guides],
  );

  const setAnswer = (id: QuizQuestionId, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const restart = () => {
    setAnswers({});
    setStep(0);
    setFinished(false);
  };

  const next = () => setStep((s) => Math.min(s + 1, QUIZ_QUESTIONS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className={styles.quiz}>
      <header className={styles.lede}>
        <h1 className={styles.ledeTitle}>{title}</h1>
        <p className={styles.ledeBody}>{intro}</p>
      </header>

      {result ? (
        <ResultView result={result} onRestart={restart} />
      ) : style === "scroll" ? (
        <ScrollStyle
          answers={answers}
          onSelect={setAnswer}
          onFinish={() => setFinished(true)}
        />
      ) : style === "split" ? (
        <SplitStyle
          step={step}
          answers={answers}
          onSelect={(v) => setAnswer(QUIZ_QUESTIONS[step].id, v)}
          onBack={back}
          onNext={next}
          onFinish={() => setFinished(true)}
        />
      ) : (
        <WizardStyle
          step={step}
          answers={answers}
          onSelect={(v) => setAnswer(QUIZ_QUESTIONS[step].id, v)}
          onBack={back}
          onNext={next}
          onFinish={() => setFinished(true)}
        />
      )}
    </div>
  );
}
