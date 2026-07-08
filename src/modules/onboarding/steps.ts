import { IdentityStep } from "./steps/IdentityStep";
import { BrandStep } from "./steps/BrandStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { WizardStepDef } from "./types";

/**
 * The wizard's step sequence — the registry.ts-equivalent for this module
 * (cf. src/blocks/registry.ts). Every step's `isComplete` returns true —
 * identity/brand have sensible defaults and review is just a summary.
 * "Next →" is always enabled on every step.
 *
 * Steps are always shown in order regardless of difficulty selection —
 * difficulty only controls the density of help text and defaults within
 * each step, not which steps are shown or skipped.
 */
export const ONBOARDING_STEPS: WizardStepDef[] = [
  {
    id: "identity",
    title: "Name your site",
    blurb: "The basics that show up in browser tabs and search results.",
    isComplete: () => true,
    Render: IdentityStep,
  },
  {
    id: "brand",
    title: "Pick your look",
    blurb: "Colors and type — you can always fine-tune this later.",
    isComplete: () => true,
    Render: BrandStep,
  },
  {
    id: "review",
    title: "You're all set",
    blurb: "",
    isComplete: () => true,
    Render: ReviewStep,
  },
];
