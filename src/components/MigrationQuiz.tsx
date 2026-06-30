"use client";

import { useState } from "react";
import Link from "next/link";
import { QUIZ_QUESTIONS, QuizAnswer, QuizResult } from "@/lib/quiz";
import { Guide } from "@/lib/db";
import { GuideCard } from "@/components/GuideCard";

const VERDICT_LABEL: Record<QuizResult["verdict"], string> = {
  migrate_now: "You're ready to migrate now",
  migrate_later: "You could migrate, with a bit more prep",
  stay_hosted: "Staying hosted is probably the right call for now",
};

export function MigrationQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ result: QuizResult; guides: Guide[] } | null>(null);

  const question = QUIZ_QUESTIONS[step];

  async function selectOption(value: string) {
    const nextAnswers = [...answers.filter((a) => a.questionId !== question.id), { questionId: question.id, value }];
    setAnswers(nextAnswers);

    if (step < QUIZ_QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: nextAnswers }),
    });
    setResult(await res.json());
    setSubmitting(false);
  }

  function restart() {
    setStep(0);
    setAnswers([]);
    setResult(null);
  }

  if (result) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-medium mb-3" style={{ color: "var(--foreground)" }}>{VERDICT_LABEL[result.result.verdict]}</h2>
          <ul className="text-sm space-y-1.5" style={{ color: "var(--muted)" }}>
            {result.result.rationale.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>

        {result.guides.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Guides for you</h3>
            <div className="flex flex-col">{result.guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
          </div>
        )}

        <div className="flex gap-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={restart} className="text-xs uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
            Retake quiz
          </button>
          <Link href="/guides" className="text-xs uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ color: "var(--background)", background: "var(--foreground)" }}>
            Browse all guides
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-xs" style={{ color: "var(--muted)" }}>Question {step + 1} of {QUIZ_QUESTIONS.length}</p>
      <h2 className="text-xl font-medium" style={{ color: "var(--foreground)" }}>{question.prompt}</h2>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            disabled={submitting}
            onClick={() => selectOption(opt.value)}
            className="text-left text-sm px-4 py-3 transition-colors disabled:opacity-50"
            style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {submitting && <p className="text-xs" style={{ color: "var(--muted)" }}>Scoring your answers…</p>}
    </div>
  );
}
