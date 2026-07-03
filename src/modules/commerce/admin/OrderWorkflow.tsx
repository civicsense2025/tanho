"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { fulfillOrder, refundOrder } from "../order-actions";
import type { DisputeRow, OrderRow } from "../queries";
import styles from "./commerce.module.css";

const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "—");

/** Status-driven order actions. Refund is owner-only (button hidden otherwise). */
export function OrderWorkflow({
  order,
  dispute,
  isOwner,
}: {
  order: OrderRow;
  dispute: DisputeRow | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [tracking, setTracking] = useState(order.tracking);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fulfill = () =>
    startTransition(async () => {
      setError(null);
      const res = await fulfillOrder(order.id, tracking);
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  const refund = () =>
    startTransition(async () => {
      setError(null);
      if (!window.confirm("Refund this order? This calls Stripe and cannot be undone.")) return;
      const res = await refundOrder(order.id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  if (order.status === "pending") {
    return <p className={styles.faint}>Waiting on payment — this order isn&rsquo;t paid yet.</p>;
  }

  if (order.status === "refunded" || order.status === "cancelled") {
    return <p className={styles.faint}>This order is {order.status}. No further action.</p>;
  }

  if (order.status === "disputed") {
    return (
      <div className={styles.disputeCard}>
        <h4 className={styles.disputeHead}>
          Dispute — evidence due {day(dispute?.evidenceDueAt ?? null)}
        </h4>
        <p className={styles.disputeBody}>
          The cardholder&rsquo;s bank opened this dispute
          {dispute?.reason ? (
            <>
              {" "}
              — reason: <strong>{dispute.reason}</strong>
            </>
          ) : (
            "."
          )}{" "}
          Submit tracking, delivery confirmation and any customer messages as evidence
          directly on Stripe; you can&rsquo;t respond from here.
        </p>
        <a className={styles.disputeLink} href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
          Respond on Stripe ↗
        </a>
      </div>
    );
  }

  if (order.status === "fulfilled") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <span className={styles.mono}>Tracking: {order.tracking || "—"}</span>
        <span className={styles.faint}>Inventory adjusted automatically.</span>
      </div>
    );
  }

  // paid / unfulfilled
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Field label="Tracking number">
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Carrier + number" />
      </Field>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button variant="accent" size="sm" onClick={fulfill} loading={pending}>
          Mark fulfilled
        </Button>
        {isOwner ? (
          <Button variant="outline" size="sm" onClick={refund} disabled={pending}>
            Refund
          </Button>
        ) : null}
      </div>
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
