"use client";

import { GeneralForm } from "@/modules/settings/admin/GeneralForm";
import type { GeneralSettings } from "@/modules/settings/validation";
import type { WizardStepProps } from "../types";

/**
 * Wraps the EXISTING GeneralForm as-is (no reimplementation) — it already
 * saves via saveSettings("general", ...) in place, so this step doesn't
 * need an onConnected-style callback; the wizard's own Next button is what
 * advances, independent of GeneralForm's internal save button.
 */
export function IdentityStep({ initial }: WizardStepProps) {
  return <GeneralForm initial={initial.general as GeneralSettings} />;
}
