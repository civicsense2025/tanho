"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/modules/settings/actions";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import type { MembershipSettings, MembershipTier } from "../validation";
import { TierRow } from "./TierRow";
import styles from "./membership-admin.module.css";

const emptyTier = (): MembershipTier => ({
  id: "",
  slug: "",
  name: "",
  priceCents: 0,
  cadence: "mo",
  features: [],
  stripePriceId: "",
  featured: false,
});

/** Membership settings — tier repeater + Billing Portal toggle. Owner-only. */
export function MembershipSettingsScreen({
  initial,
  connected,
}: {
  initial: MembershipSettings;
  connected: boolean;
}) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mutate = (next: MembershipSettings) => {
    setS(next);
    setDirty(true);
    setFlash(null);
  };

  const patchTier = (i: number, patch: Partial<MembershipTier>) =>
    mutate({ ...s, tiers: s.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const removeTier = (i: number) =>
    mutate({ ...s, tiers: s.tiers.filter((_, j) => j !== i) });

  const addTier = () => mutate({ ...s, tiers: [...s.tiers, emptyTier()] });

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings("membership", s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            className={styles.flash}
            data-ok={flash.includes("✓") || undefined}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      {!connected ? (
        <p className={styles.notice}>
          Stripe isn&rsquo;t connected. Add <code>STRIPE_SECRET_KEY</code> and{" "}
          <code>STRIPE_WEBHOOK_SECRET</code> to your <code>.env</code> to take
          live memberships. You can still define tiers now.
        </p>
      ) : null}

      <Section
        title="Tiers"
        desc="Up to six membership tiers. Prices are what members are billed each period."
      >
        <div className={styles.tiers}>
          {s.tiers.map((tier, i) => (
            <TierRow
              key={i}
              tier={tier}
              onChange={(patch) => patchTier(i, patch)}
              onRemove={() => removeTier(i)}
            />
          ))}
        </div>
        {s.tiers.length < 6 ? (
          <Button variant="outline" size="sm" onClick={addTier}>
            Add tier
          </Button>
        ) : null}
      </Section>

      <Section title="Billing" desc="Let members manage their own subscription.">
        <Row label="Self-serve Billing Portal">
          <Toggle
            value={s.portalEnabled}
            onChange={(v) => mutate({ ...s, portalEnabled: v })}
          />
        </Row>
      </Section>
    </div>
  );
}
