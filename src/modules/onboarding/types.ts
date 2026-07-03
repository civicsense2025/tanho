import type { ReactNode } from "react";
import type { OnboardingState } from "./validation";

/**
 * The wizard-step contract — mirrors BlockDef (src/blocks/types.ts): one
 * definition unifies heterogeneous step types (a settings form, a brand
 * editor, a data-source connect flow, a summary screen) behind a single
 * `Render` slot, so the shell never special-cases a step by id.
 */
export type WizardStepId = "identity" | "brand" | "data-source" | "review";

/**
 * Server-fetched seed data every step might need (e.g. GeneralSettings for
 * the identity step, ThemeInput for brand). Fetched once, server-side, in
 * the wizard's page.tsx (mirroring how each standalone /admin/settings/*
 * page fetches its own `initial` prop) and threaded down here — steps
 * never fetch their own data, keeping WizardShell a plain client component.
 */
export type WizardInitialData = {
  general: unknown;
  theme: unknown;
  /** Whether the deployment has registered a Supabase OAuth app — gates the "Connect with Supabase" link, same check the standalone connections screen uses. */
  supabaseOAuthConfigured: boolean;
};

export type WizardStepProps = {
  state: OnboardingState;
  initial: WizardInitialData;
  /** 1=beginner, 2=intermediate, 3=advanced. Controls defaults/help-density only, never reachability. */
  difficulty: 1 | 2 | 3;
  /** The step calls this itself once its own work is done (e.g. after a successful save). */
  onStepComplete: () => void;
};

export type WizardStepDef = {
  id: WizardStepId;
  title: string;
  blurb: string;
  /** Whether this step's own criteria are already satisfied (e.g. resuming a partially-done wizard). */
  isComplete: (state: OnboardingState) => boolean;
  Render: (props: WizardStepProps) => ReactNode;
};
