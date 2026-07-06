"use client";

import { useEffect, useRef } from "react";
import { GeneralForm, type GeneralFormHandle } from "@/modules/settings/admin/GeneralForm";
import type { GeneralSettings } from "@/modules/settings/validation";
import type { WizardStepProps } from "../types";

/**
 * Wraps the EXISTING GeneralForm as-is (no reimplementation) — it already
 * saves via saveSettings("general", ...). Registers GeneralForm's
 * imperative save handle with the shell (via `registerSave`) so the
 * wizard's Next button forces a save first — without this, a user could
 * type a site name, click Next, and lose it without ever clicking
 * GeneralForm's own separate Save button.
 */
export function IdentityStep({ initial, registerSave }: WizardStepProps) {
  const formRef = useRef<GeneralFormHandle>(null);

  useEffect(() => {
    registerSave?.(async () => {
      const saved = await formRef.current?.save();
      if (saved === null) return false; // save failed — do not advance
      // Report the just-saved value back so the shell's copy of
      // WizardInitialData — and therefore ReviewStep — reflects it, not the
      // page-load snapshot.
      return { general: saved ?? initial.general };
    });
  }, [registerSave, initial.general]);

  return <GeneralForm ref={formRef} initial={initial.general as GeneralSettings} />;
}
