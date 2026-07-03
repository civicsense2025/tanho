"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import { markStepComplete, setOnboardingDifficulty, completeOnboarding } from "../actions";
import { ONBOARDING_STEPS } from "../steps";
import type { WizardInitialData } from "../types";
import type { OnboardingState } from "../validation";
import { DifficultyPicker } from "./DifficultyPicker";
import styles from "./WizardShell.module.css";

/**
 * The setup-wizard shell. Adapts quiz/public/WizardStyle.tsx's ownership
 * model (parent owns `step`, renders progress + Back/Next, delegates the
 * body to the current step) — but unlike the quiz's fixed multiple-choice
 * questions, steps here are heterogeneous forms: "Next" is gated by each
 * step's own `isComplete(state)`, and a step calls `onStepComplete()`
 * itself once its own save/connect action succeeds, rather than the shell
 * inferring completion from a shared answers map.
 */
export function WizardShell({
  initialState,
  initialData,
}: {
  initialState: OnboardingState;
  initialData: WizardInitialData;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(0);
  const [difficultyChosen, setDifficultyChosen] = useState(
    initialState.completedSteps.length > 0 || initialState.dismissedAt !== null,
  );
  const [pending, startTransition] = useTransition();

  const steps = ONBOARDING_STEPS;
  const isLast = step === steps.length - 1;
  const current = steps[step];

  const chooseDifficulty = (difficulty: 1 | 2 | 3) =>
    startTransition(async () => {
      await setOnboardingDifficulty(difficulty);
      setState((s) => ({ ...s, difficulty }));
      setDifficultyChosen(true);
    });

  /**
   * Advances past the current step. `markComplete` records it as done in
   * onboarding state — pass false for "Skip for now" (the step's own work
   * wasn't finished, but the owner can revisit it later from Settings; an
   * unfinished data-source step is still safe to skip since an empty
   * allowlist already fails closed).
   */
  const goNext = (markComplete: boolean) =>
    startTransition(async () => {
      if (markComplete) {
        await markStepComplete(current.id);
        setState((s) => ({
          ...s,
          completedSteps: s.completedSteps.includes(current.id)
            ? s.completedSteps
            : [...s.completedSteps, current.id],
        }));
      }
      if (isLast) {
        await completeOnboarding();
        router.push("/admin");
        router.refresh();
      } else {
        setStep((s) => s + 1);
      }
    });

  if (!difficultyChosen) {
    return (
      <div className={styles.shell}>
        <DifficultyPicker onChoose={chooseDifficulty} pending={pending} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <p className={styles.progress}>
        Step {step + 1} of {steps.length}
      </p>
      <div className={styles.step}>
        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.blurb}>{current.blurb}</p>
        <current.Render
          state={state}
          initial={initialData}
          difficulty={state.difficulty}
          onStepComplete={() => goNext(true)}
        />
      </div>
      <div className={styles.controls}>
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          ← Back
        </Button>
        <span className={styles.spacer} />
        {!current.isComplete(state) ? (
          <Button variant="ghost" onClick={() => goNext(false)} loading={pending}>
            Skip for now
          </Button>
        ) : null}
        <Button
          variant="accent"
          onClick={() => goNext(true)}
          loading={pending}
          disabled={!current.isComplete(state)}
        >
          {isLast ? "Finish" : "Next →"}
        </Button>
      </div>
    </div>
  );
}
