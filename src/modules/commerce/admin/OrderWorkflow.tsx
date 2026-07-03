"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { fulfillOrder, refundOrder } from "../order-actions";
import type { DisputeRow, OrderRow } from "../queries";
import styles from "./commerce.module.css";

const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "—");
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const REFUND_REASONS = [
  { value: "", label: "No reason" },
  { value: "requested_by_customer", label: "Requested by customer" },
  { value: "duplicate", label: "Duplicate charge" },
  { value: "fraudulent", label: "Fraudulent" },
] as const;

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
  const remainingCents = order.totalCents - order.refundedCents;
  const [refundAmount, setRefundAmount] = useState((remainingCents / 100).toFixed(2));
  const [refundReason, setRefundReason] = useState<string>("");
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
      const confirmMsg =
        order.status === "fulfilled"
          ? "Refund this order? It has already shipped — Stripe does not block this, but make sure you intend to refund a fulfilled order."
          : "Refund this order? This calls Stripe and cannot be undone.";
      if (!window.confirm(confirmMsg)) return;
      const amountCents = Math.round(Number.parseFloat(refundAmount || "0") * 100);
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        setError("Enter a valid refund amount");
        return;
      }
      const res = await refundOrder(order.id, {
        amountCents,
        reason: refundReason || undefined,
      });
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  const refundControls = isOwner ? (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {order.refundedCents > 0 ? (
        <span className={styles.faint}>
          {money(order.refundedCents)} of {money(order.totalCents)} refunded
        </span>
      ) : null}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <Input
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          style={{ width: "6rem" }}
          inputMode="decimal"
        />
        <Select value={refundReason} onChange={(e) => setRefundReason(e.target.value)}>
          {REFUND_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" size="sm" onClick={refund} disabled={pending}>
          Refund
        </Button>
      </div>
    </div>
  ) : null;

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

  if (dispute?.status === "early_fraud_warning") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div className={styles.disputeCard}>
          <h4 className={styles.disputeHead}>Flagged as high-risk by Stripe Radar</h4>
          <p className={styles.disputeBody}>
            Stripe flagged this payment as likely fraudulent
            {dispute.reason ? (
              <>
                {" "}
                — reason: <strong>{dispute.reason}</strong>
              </>
            ) : (
              "."
            )}{" "}
            Review before shipping — consider a proactive refund to avoid a later dispute.
          </p>
          <a className={styles.disputeLink} href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
            Review on Stripe ↗
          </a>
        </div>
        {refundControls}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    );
  }

  if (order.status === "fulfilled") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <span className={styles.mono}>Tracking: {order.tracking || "—"}</span>
        <span className={styles.faint}>Inventory adjusted automatically.</span>
        {refundControls}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    );
  }

  if (order.source === "donation") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <span className={styles.faint}>Donation — no fulfillment needed.</span>
        {refundControls}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    );
  }

  // paid / unfulfilled
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Field label="Tracking number">
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Carrier + number" />
      </Field>
      <Button variant="accent" size="sm" onClick={fulfill} loading={pending} style={{ alignSelf: "flex-start" }}>
        Mark fulfilled
      </Button>
      {refundControls}
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
