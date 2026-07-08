import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getTheme } from "@/modules/theme/queries";
import { isSupabaseOAuthConfigured } from "@/adapters/supabase-oauth/config";
import { getOnboardingState } from "@/modules/onboarding/queries";
import { listConnections } from "@/modules/data-sources/queries";
import { WizardShell } from "@/modules/onboarding/public/WizardShell";

export const metadata = { title: "Setup guide" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

async function OnboardingPageInner() {
  await requireUser("owner");

  const [state, general, theme, connections] = await Promise.all([
    getOnboardingState(),
    getGeneralSettings(),
    getTheme(),
    listConnections(),
  ]);

  const existingConnection = connections[0] ?? null;

  // If a data source already exists, treat the data-source step as complete so
  // the wizard lands past it and its "Next" is enabled — the step itself just
  // shows a "Connected" card (nothing to create). Derived at view time only; we
  // don't persist it (no write here), and building a fresh object avoids
  // mutating the cached `getOnboardingState()` result.
  const effectiveState =
    existingConnection && !state.completedSteps.includes("data-source")
      ? { ...state, completedSteps: [...state.completedSteps, "data-source"] }
      : state;

  return (
    <WizardShell
      initialState={effectiveState}
      initialData={{
        general,
        theme,
        supabaseOAuthConfigured: isSupabaseOAuthConfigured(),
        existingConnection,
      }}
    />
  );
}
