"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/modules/settings/actions";
import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { CURRENCIES, type PaymentsSettings } from "../validation";
import styles from "./commerce.module.css";

/** Payments settings — Stripe connection state + provider-level commerce config. */
export function PaymentsSettingsScreen({
  initial,
  connected,
}: {
  initial: PaymentsSettings;
  connected: boolean;
}) {
  const [s, setS] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PaymentsSettings>(k: K, v: PaymentsSettings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings("payments", s);
      setFlash(res.error ?? "Saved ✓");
      if (!res.error) setTimeout(() => setFlash(null), 1600);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: flash.includes("✓") ? "var(--success)" : "var(--danger)" }}>
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save
        </Button>
      </div>

      <Section title="Stripe" desc="Payments are configured from the environment — no keys are stored in the database.">
        {connected ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            <span className={styles.dot} style={{ background: "var(--accent-2)" }} /> Connected via
            environment keys. Checkout and refunds are live.
          </p>
        ) : (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-relaxed)" }}>
            Not connected. Add <code>STRIPE_SECRET_KEY</code> (and{" "}
            <code>STRIPE_WEBHOOK_SECRET</code>) to your <code>.env</code> and redeploy. Until then,
            checkout is disabled and products won&rsquo;t sync.
          </p>
        )}
      </Section>

      <Section title="Configuration">
        <Row label="Currency">
          <Select value={s.currency} onChange={(e) => set("currency", e.target.value as PaymentsSettings["currency"])}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Statement descriptor">
          <Input
            value={s.statementDescriptor}
            maxLength={22}
            onChange={(e) => set("statementDescriptor", e.target.value.toUpperCase().slice(0, 22))}
            placeholder="MAX 22 CHARS"
          />
        </Row>
        <Row label="Automatic tax">
          <Toggle value={s.automaticTax} onChange={(v) => set("automaticTax", v)} />
        </Row>
        <Row label="Payout schedule">
          <Seg
            value={s.payoutSchedule}
            onChange={(v) => set("payoutSchedule", v as PaymentsSettings["payoutSchedule"])}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </Row>
      </Section>
    </div>
  );
}
