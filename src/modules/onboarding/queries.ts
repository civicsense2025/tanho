import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import { ONBOARDING_DEFAULTS, onboardingStateSchema, type OnboardingState } from "./validation";

/** Uncached read — for server actions that need read-your-own-writes. */
export async function readOnboardingState(): Promise<OnboardingState> {
  const data = await readSettingRow("onboarding");
  const parsed = onboardingStateSchema.safeParse(data);
  return parsed.success ? parsed.data : ONBOARDING_DEFAULTS;
}

/** Cached read for the dashboard/layout/first-run redirect check. */
export async function getOnboardingState(): Promise<OnboardingState> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:onboarding");
  return readOnboardingState();
}
