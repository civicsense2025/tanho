"use client";

import { useEffect, useRef } from "react";
import { BrandEditor, type BrandEditorHandle } from "@/modules/theme/admin/BrandEditor";
import type { ThemeInput } from "@/modules/theme/validation";
import type { WizardStepProps } from "../types";

/** Wraps the EXISTING BrandEditor as-is — same reuse + registerSave rationale as IdentityStep. */
export function BrandStep({ initial, registerSave }: WizardStepProps) {
  const editorRef = useRef<BrandEditorHandle>(null);

  useEffect(() => {
    registerSave?.(async () => {
      const saved = await editorRef.current?.save();
      if (saved === null) return false; // save failed — do not advance
      return { theme: saved ?? initial.theme };
    });
  }, [registerSave, initial.theme]);

  return <BrandEditor ref={editorRef} initial={initial.theme as ThemeInput} />;
}
