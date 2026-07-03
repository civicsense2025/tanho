"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/modules/settings/actions";
import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import type { EcommerceSettings } from "../validation";
import type { ShippingZoneRow } from "../queries";
import { ZonesTable } from "./ZonesTable";
import { SetupChecklist, type SetupChecklistItem } from "./SetupChecklist";
import styles from "./commerce.module.css";

/** Shipping settings — fulfillment origin, processing days, and zones table. */
export function ShippingSettingsScreen({
  settings,
  zones,
  setupItems,
}: {
  settings: EcommerceSettings;
  zones: ShippingZoneRow[];
  setupItems?: SetupChecklistItem[];
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState(settings.origin);
  const [processingDays, setProcessingDays] = useState(settings.processingDays);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings("ecommerce", { ...settings, origin, processingDays });
      setFlash(res.error ?? "Saved ✓");
      if (!res.error) {
        router.refresh();
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return (
    <main className={`${styles.page}`}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Shipping</h1>
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

      {setupItems ? <SetupChecklist items={setupItems} /> : null}

      <Section title="Fulfillment" desc="Where you ship from and how long orders take to process.">
        <Row label="Origin">
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="City, region" />
        </Row>
        <Row label="Processing time">
          <Input value={processingDays} onChange={(e) => setProcessingDays(e.target.value)} />
        </Row>
      </Section>

      <Section title="Zones" desc="Flat or weight-based rates, with an optional free-shipping threshold.">
        <ZonesTable zones={zones} onChange={() => router.refresh()} />
      </Section>
    </main>
  );
}
