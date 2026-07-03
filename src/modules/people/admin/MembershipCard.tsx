"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantMembership, removeMembership } from "../admin-actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import styles from "./profile.module.css";

type Membership = {
  id: string;
  tier: string;
  status: string;
  priceCents: number;
  since: number;
  currentPeriodEnd: number | null;
};

const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "—");
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Membership sidebar card. Grant/Remove are owner-gated (server-enforced). */
export function MembershipCard({
  personId,
  membership,
  isOwner,
}: {
  personId: string;
  membership: Membership | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [tier, setTier] = useState("");
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();

  const grant = () =>
    startTransition(async () => {
      await grantMembership({
        personId,
        tier: tier.trim(),
        priceCents: Math.round(Number(price || 0) * 100),
      });
      setTier("");
      setPrice("");
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (membership) await removeMembership(membership.id);
      router.refresh();
    });

  return (
    <section className={styles.card}>
      <h3 className={styles.cardHead}>Membership</h3>
      {membership && membership.status === "active" ? (
        <>
          <dl className={styles.meta}>
            <div>
              <dt>Tier</dt>
              <dd>{membership.tier}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd className={styles.mono}>{money(membership.priceCents)}</dd>
            </div>
            <div>
              <dt>Since</dt>
              <dd className={styles.mono}>{day(membership.since)}</dd>
            </div>
            <div>
              <dt>Next</dt>
              <dd className={styles.mono}>{day(membership.currentPeriodEnd)}</dd>
            </div>
          </dl>
          {isOwner ? (
            <Button size="sm" variant="outline" onClick={remove} loading={pending}>
              Remove membership
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <p className={styles.faint}>Free — no paid membership.</p>
          {isOwner ? (
            <div className={styles.grant}>
              <Input
                placeholder="Tier"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              />
              <Input
                placeholder="Price / mo"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Button size="sm" onClick={grant} loading={pending} disabled={!tier.trim()}>
                Grant comp
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
