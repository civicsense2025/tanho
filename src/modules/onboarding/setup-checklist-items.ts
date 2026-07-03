import type { SetupChecklistItem } from "@/modules/commerce/admin/SetupChecklist";
import type { OnboardingState } from "./validation";
import { ONBOARDING_STEPS } from "./steps";

/** Builds the wizard's own setup checklist from onboarding state — reuses the SAME SetupChecklist component as the commerce module. */
export function onboardingChecklistItems(state: OnboardingState): SetupChecklistItem[] {
  return ONBOARDING_STEPS.filter((s) => s.id !== "review").map((s) => ({
    label: s.title,
    done: state.completedSteps.includes(s.id),
  }));
}
