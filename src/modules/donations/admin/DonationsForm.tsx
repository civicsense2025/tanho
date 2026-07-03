"use client";

import { useState, useTransition } from "react";
import { saveDonationsSettings } from "../actions";
import type { DonationsSettings } from "../validation";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/core/Button";

const toDollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (dollars: string) => Math.round((Number.parseFloat(dollars) || 0) * 100);

/** Donations settings screen — enable, amount bounds, Stripe sync on save. */
export function DonationsForm({ initial }: { initial: DonationsSettings }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof DonationsSettings>(k: K, v: DonationsSettings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveDonationsSettings(s);
      if (!res.ok) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

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

      <Section title="Donations" desc="Accept one-time, pay-what-you-want donations at /donate.">
        <Row label="Accept donations">
          <Toggle value={s.enabled} onChange={(v) => set("enabled", v)} on="Enabled" off="Disabled" />
        </Row>
        <Row label="Suggested amount">
          <Input
            value={toDollars(s.presetCents)}
            onChange={(e) => set("presetCents", toCents(e.target.value))}
            inputMode="decimal"
          />
        </Row>
        <Row label="Minimum">
          <Input
            value={toDollars(s.minCents)}
            onChange={(e) => set("minCents", toCents(e.target.value))}
            inputMode="decimal"
          />
        </Row>
        <Row label="Maximum">
          <Input
            value={toDollars(s.maxCents)}
            onChange={(e) => set("maxCents", toCents(e.target.value))}
            inputMode="decimal"
          />
        </Row>
      </Section>

      <Section title="Donate page copy">
        <Row label="Heading">
          <Input value={s.heading} onChange={(e) => set("heading", e.target.value)} />
        </Row>
        <Row label="Body" stack>
          <Textarea rows={3} value={s.body} onChange={(e) => set("body", e.target.value)} />
        </Row>
      </Section>
    </div>
  );
}
