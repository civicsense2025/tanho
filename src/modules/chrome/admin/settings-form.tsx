"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/modules/settings/actions";
import { Button } from "@/components/core/Button";

/**
 * Shared plumbing for the chrome settings screens (header / footer /
 * announcement): local draft state, dirty tracking, save through the
 * owner-gated saveSettings action, and the save bar UI.
 */
export function useSettingsForm<T extends object>(namespace: string, initial: T) {
  const [s, setS] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<T>) => {
    setS((prev) => ({ ...prev, ...p }));
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings(namespace, s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return { s, patch, dirty, flash, pending, save };
}

export function SaveBar({
  dirty,
  flash,
  pending,
  onSave,
}: {
  dirty: boolean;
  flash: string | null;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span style={{ flex: 1 }} />
      {flash ? (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
          }}
        >
          {flash}
        </span>
      ) : null}
      <Button variant="accent" size="sm" onClick={onSave} loading={pending}>
        {dirty ? "Save •" : "Save"}
      </Button>
    </div>
  );
}
