"use client";

import { useState } from "react";
import { QUIZ_QUESTIONS, QuizAnswer, QuizResult } from "@/lib/quiz";
import { Guide } from "@/lib/db";
import { GuideCard } from "@/components/GuideCard";
import { Button } from "@/components/ui";

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
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <div>
          <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h2)", fontWeight: 500, color: "var(--text)" }}>
            {VERDICT_LABEL[result.result.verdict]}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
            {result.result.rationale.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>

        {result.guides.length > 0 && (
          <div>
            <h3 style={{ margin: "0 0 var(--space-2)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
              Guides for you
            </h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {result.guides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
          <Button variant="outline" size="sm" onClick={restart}>
            Retake quiz
          </Button>
          <Button as="a" href="/guides" variant="accent" size="sm">
            Browse all guides
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        Question {step + 1} of {QUIZ_QUESTIONS.length}
      </p>
      <h2 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: 500, color: "var(--text)" }}>{question.prompt}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {question.options.map((opt) => (
          <button
            key={opt.value}
            disabled={submitting}
            onClick={() => selectOption(opt.value)}
            style={{
              textAlign: "left",
              fontSize: "var(--text-sm)",
              color: "var(--text)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-3) var(--space-4)",
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.5 : 1,
              transition: "var(--transition)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {submitting && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Scoring your answers…</p>}
    </div>
  );
}
