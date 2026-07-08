"use client";

import { useState, useTransition } from "react";
import { saveAppearanceSettings } from "@/modules/settings/actions";
import type { AppearanceSettings } from "@/modules/settings/validation";
import { Section, Row } from "@/components/admin/Section";
import { Button } from "@/components/core/Button";

const MODES: Array<{ value: AppearanceSettings["siteMode"]; label: string; desc: string }> = [
  { value: "light", label: "Light", desc: "Always light, regardless of the visitor's OS setting." },
  { value: "dark", label: "Dark", desc: "Always dark, regardless of the visitor's OS setting." },
  { value: "system", label: "System", desc: "Follow each visitor's OS preference (light or dark)." },
];

/** The Appearance settings screen — site-wide theme mode. */
export function AppearanceForm({ initial }: { initial: AppearanceSettings }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const doSave = async (): Promise<boolean> => {
    const res = await saveAppearanceSettings(s);
    if (res.error) {
      setFlash(res.error);
      return false;
    }
    setDirty(false);
    setFlash("Saved ✓");
    setTimeout(() => setFlash(null), 1600);
    return true;
  };

  const save = () =>
    startTransition(() => {
      void doSave();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
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
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section
        title="Theme mode"
        desc="The default appearance for your site. Visitors can override this with their own preference (when the theme toggle is enabled in the header)."
      >
        <Row label="Site mode">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {MODES.map((m) => (
              <label
                key={m.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  cursor: "pointer",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${s.siteMode === m.value ? "var(--accent)" : "var(--border)"}`,
                  background: s.siteMode === m.value ? "var(--accent-tint)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="siteMode"
                  value={m.value}
                  checked={s.siteMode === m.value}
                  onChange={() => {
                    setS((p) => ({ ...p, siteMode: m.value }));
                    setDirty(true);
                    setFlash(null);
                  }}
                  style={{ marginTop: 3, accentColor: "var(--accent)" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {m.label}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {m.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </Row>
      </Section>
    </div>
  );
}
