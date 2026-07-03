"use server";

import { saveSettings } from "@/modules/settings/actions";
import { readOnboardingState } from "./queries";
import type { WizardStepId } from "./types";

export type OnboardingActionState = { ok: boolean; error?: string };

/** Persist the difficulty tier chosen on the wizard's first screen. */
export async function setOnboardingDifficulty(difficulty: 1 | 2 | 3): Promise<OnboardingActionState> {
  const current = await readOnboardingState();
  const res = await saveSettings("onboarding", { ...current, difficulty });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Mark one wizard step complete (idempotent — no duplicate ids). */
export async function markStepComplete(stepId: WizardStepId): Promise<OnboardingActionState> {
  const current = await readOnboardingState();
  const completedSteps = current.completedSteps.includes(stepId)
    ? current.completedSteps
    : [...current.completedSteps, stepId];
  const res = await saveSettings("onboarding", { ...current, completedSteps });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Finish (or explicitly skip) the wizard — stops the first-login redirect for good. */
export async function completeOnboarding(): Promise<OnboardingActionState> {
  const current = await readOnboardingState();
  const res = await saveSettings("onboarding", { ...current, dismissedAt: Date.now() });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
