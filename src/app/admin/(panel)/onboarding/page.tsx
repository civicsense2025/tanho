import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getTheme } from "@/modules/theme/queries";
import { isSupabaseOAuthConfigured } from "@/adapters/supabase-oauth/config";
import { getOnboardingState } from "@/modules/onboarding/queries";
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

  const [state, general, theme] = await Promise.all([
    getOnboardingState(),
    getGeneralSettings(),
    getTheme(),
  ]);

  return (
    <WizardShell
      initialState={state}
      initialData={{
        general,
        theme,
        supabaseOAuthConfigured: isSupabaseOAuthConfigured(),
      }}
    />
  );
}
