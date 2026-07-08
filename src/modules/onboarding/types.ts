import type { ReactNode } from "react";
import type { OnboardingState } from "./validation";
import type { DataSourceConnectionSummary } from "@/modules/data-sources/queries";

/**
 * The wizard-step contract — mirrors BlockDef (src/blocks/types.ts): one
 * definition unifies heterogeneous step types (a settings form, a brand
 * editor, a summary screen) behind a single `Render` slot, so the shell
 * never special-cases a step by id.
 */
export type WizardStepId = "identity" | "brand" | "review";

/**
 * Server-fetched seed data every step might need (e.g. GeneralSettings for
 * the identity step, ThemeInput for brand). Fetched once, server-side, in
 * the wizard's page.tsx (mirroring how each standalone /admin/settings/*
 * page fetches its own `initial` prop) and threaded down here.
 *
 * The shell keeps its OWN mutable copy of this (seeded from the server
 * fetch, then patched via `registerSave`'s return value whenever a step
 * saves) and passes that copy down as `initial` — so ReviewStep, rendered
 * later in the same session, always reads what was actually just saved
 * rather than the page-load snapshot.
 */
export type WizardInitialData = {
  general: unknown;
  theme: unknown;
  /** Whether the deployment has registered a Supabase OAuth app — gates the "Connect with Supabase" link, same check the standalone connections screen uses. */
  supabaseOAuthConfigured: boolean;
  /** The most-recently-updated external data-source connection, if one already exists — lets the data-source step show a "Connected" state instead of nagging the owner to create one. `null` when none is configured yet. Secret-free summary (no `configEncrypted`). */
  existingConnection: DataSourceConnectionSummary | null;
};

/** A step registers its own save function here (via `registerSave`) so the
 *  shell can force a save before advancing — steps that wrap an existing
 *  admin form (GeneralForm, BrandEditor) have their own internal Save
 *  button the wizard's Next must not silently bypass. Resolves to `null`
 *  on failure (the shell then does NOT advance, leaving the error visible
 *  in the step) or the data that was saved, which the shell folds into its
 *  own copy of WizardInitialData so ReviewStep never shows a stale value —
 *  `true` (no data to report) when there was nothing to save at all. */
export type StepSaveFn = () => Promise<Partial<WizardInitialData> | boolean>;

export type WizardStepProps = {
  state: OnboardingState;
  initial: WizardInitialData;
  /** 1=beginner, 2=intermediate, 3=advanced. Controls defaults/help-density only, never reachability. */
  difficulty: 1 | 2 | 3;
  /** The step calls this itself once its own work is done (e.g. after a successful save). */
  onStepComplete: () => void;
  /** Steps with their own internal save action call this once, e.g. in a
   *  `useEffect`, to give the shell a way to trigger that save before Next
   *  advances. Steps with no separate save step (review) simply never
   *  call it. */
  registerSave?: (fn: StepSaveFn) => void;
};

export type WizardStepDef = {
  id: WizardStepId;
  title: string;
  blurb: string;
  /** Whether this step's own criteria are already satisfied (e.g. resuming a partially-done wizard). */
  isComplete: (state: OnboardingState) => boolean;
  Render: (props: WizardStepProps) => ReactNode;
};
