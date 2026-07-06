"use client";

import { forwardRef, useImperativeHandle, useState, useTransition } from "react";
import { saveSettings } from "@/modules/settings/actions";
import type { GeneralSettings } from "@/modules/settings/validation";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";

/** Imperative handle so a host (e.g. the onboarding wizard) can force a save
 *  before navigating away, instead of relying on this form's own Save button
 *  being clicked first. Resolves to the saved data on success (so the host
 *  can update its own copy instead of holding a stale pre-save snapshot),
 *  or null on failure. */
export type GeneralFormHandle = { save: () => Promise<GeneralSettings | null> };

const TIMEZONES = [
  ["UTC", "UTC"],
  ["America/New_York", "Eastern — New York"],
  ["America/Chicago", "Central — Chicago"],
  ["America/Denver", "Mountain — Denver"],
  ["America/Los_Angeles", "Pacific — Los Angeles"],
  ["Europe/London", "GMT — London"],
  ["Europe/Berlin", "CET — Berlin"],
  ["Asia/Tokyo", "JST — Tokyo"],
] as const;

/** The General settings screen — site identity, locale, visibility. */
export const GeneralForm = forwardRef<GeneralFormHandle, { initial: GeneralSettings }>(function GeneralForm(
  { initial },
  ref,
) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof GeneralSettings>(k: K, v: GeneralSettings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setFlash(null);
  };

  /** Shared by the on-screen Save button and the imperative handle below —
   *  both need the actual save outcome, not just a fire-and-forget. */
  const doSave = async (): Promise<boolean> => {
    const res = await saveSettings("general", s);
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

  useImperativeHandle(ref, () => ({
    save: async () => {
      // No unsaved changes — nothing to do, and no need to touch `pending`/
      // re-run the action for a no-op save. `s` is still the current
      // (already-saved) value, so it's safe to report back either way.
      if (!dirty) return s;
      const ok = await doSave();
      return ok ? s : null;
    },
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: flash.includes("✓") ? "var(--success)" : "var(--danger)" }}>
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section
        title="Site identity"
        desc="The basics that show up in browser tabs, search results and social shares."
      >
        <Row label="Site name">
          <Input value={s.name} onChange={(e) => set("name", e.target.value)} />
        </Row>
        <Row label="Tagline" stack>
          <Textarea
            rows={2}
            value={s.tagline}
            onChange={(e) => set("tagline", e.target.value)}
          />
        </Row>
      </Section>

      <Section title="Locale">
        <Row label="Timezone">
          <Select value={s.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {TIMEZONES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Default language">
          <Select value={s.language} onChange={(e) => set("language", e.target.value)}>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </Select>
        </Row>
      </Section>

      <Section title="Visibility">
        <Row label="Search engine indexing">
          <Toggle
            value={s.indexable}
            onChange={(v) => set("indexable", v)}
            on="Indexable"
            off="Hidden"
          />
        </Row>
      </Section>
    </div>
  );
});
