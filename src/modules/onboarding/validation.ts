import { z } from "zod";

/**
 * "onboarding" settings namespace — the setup wizard's own progress state.
 * Registered into `settingsSchemas` (src/modules/settings/validation.ts) and
 * read/written through the existing generic settings machinery, same as
 * every other namespace (general, brand, payments, ...).
 */
export const onboardingStateSchema = z.object({
  /** 1=beginner, 2=intermediate, 3=advanced — same vocabulary as the quiz module's difficultyCeiling. */
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  completedSteps: z.array(z.string()).default([]),
  /** Set once the wizard is finished or explicitly dismissed; null = not yet. */
  dismissedAt: z.number().nullable().default(null),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

export const ONBOARDING_DEFAULTS: OnboardingState = onboardingStateSchema.parse({});
