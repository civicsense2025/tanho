import { IdentityStep } from "./steps/IdentityStep";
import { BrandStep } from "./steps/BrandStep";
import { OnboardingDataSourceStep } from "./steps/OnboardingDataSourceStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { WizardStepDef } from "./types";

/**
 * The wizard's step sequence — the registry.ts-equivalent for this module
 * (cf. src/blocks/registry.ts). Every step's own criteria decide `isComplete`
 * (identity/brand have sensible defaults and are never gate-worthy; data-
 * source is the one real gate, tracked via completedSteps once a connection
 * is created; review is always "done" since it's just a summary).
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
    id: "data-source",
    title: "Connect a database",
    blurb: "Optional — only needed if a page should show live data.",
    isComplete: (state) => state.completedSteps.includes("data-source"),
    Render: OnboardingDataSourceStep,
  },
  {
    id: "review",
    title: "You're all set",
    blurb: "",
    isComplete: () => true,
    Render: ReviewStep,
  },
];
