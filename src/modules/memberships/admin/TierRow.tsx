"use client";

import { Row } from "@/components/admin/Section";
import { Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { centsToDollars, dollarsToCents } from "@/modules/commerce/money";
import type { MembershipTier } from "../validation";
import styles from "./membership-admin.module.css";

/** One editable tier card in the repeater. Prices are entered as dollars. */
export function TierRow({
  tier,
  onChange,
  onRemove,
}: {
  tier: MembershipTier;
  onChange: (patch: Partial<MembershipTier>) => void;
  onRemove: () => void;
}) {
  const setFeatures = (text: string) =>
    onChange({
      features: text
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 10),
    });

  return (
    <div className={styles.tier} data-featured={tier.featured || undefined}>
      <div className={styles.tierHead}>
        <Input
          value={tier.name}
          placeholder="Tier name"
          maxLength={80}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <Row label="Slug">
        <Input
          value={tier.slug}
          placeholder="supporter"
          maxLength={40}
          onChange={(e) => onChange({ slug: e.target.value })}
        />
      </Row>

      <Row label="Price">
        <div className={styles.priceRow}>
          <span className={styles.dollar}>$</span>
          <Input
            value={centsToDollars(tier.priceCents)}
            inputMode="decimal"
            onChange={(e) => onChange({ priceCents: dollarsToCents(e.target.value) })}
          />
          <Seg
            value={tier.cadence}
            onChange={(v) => onChange({ cadence: v as MembershipTier["cadence"] })}
            options={[
              { value: "mo", label: "/mo" },
              { value: "yr", label: "/yr" },
            ]}
          />
        </div>
      </Row>

      <Row label="Features" stack>
        <textarea
          className={styles.textarea}
          value={tier.features.join("\n")}
          rows={4}
          placeholder="One feature per line"
          onChange={(e) => setFeatures(e.target.value)}
        />
      </Row>

      <Row label="Stripe price id">
        <Input
          value={tier.stripePriceId}
          placeholder="price_..."
          maxLength={120}
          onChange={(e) => onChange({ stripePriceId: e.target.value })}
        />
      </Row>
      <p className={styles.help}>
        Paste a recurring Price id from your Stripe dashboard.
      </p>

      <Row label="Featured">
        <label className={styles.featuredToggle}>
          <input
            type="checkbox"
            checked={tier.featured}
            onChange={(e) => onChange({ featured: e.target.checked })}
          />
          <span>Highlight this tier</span>
        </label>
      </Row>
    </div>
  );
}
