"use client";

import { BrandEditor } from "@/modules/theme/admin/BrandEditor";
import type { ThemeInput } from "@/modules/theme/validation";
import type { WizardStepProps } from "../types";

/** Wraps the EXISTING BrandEditor as-is — same reuse rationale as IdentityStep. */
export function BrandStep({ initial }: WizardStepProps) {
  return <BrandEditor initial={initial.theme as ThemeInput} />;
}
