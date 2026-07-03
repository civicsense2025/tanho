"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import { unlockStore } from "../ecommerce-actions";
import styles from "./commerce.module.css";

/**
 * Store-locked upsell. The "Enable store" button is owner-only (the server
 * action re-checks); non-owners see the copy without the action.
 */
export function LockedStore({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const enable = () =>
    startTransition(async () => {
      setError(null);
      const res = await unlockStore();
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  return (
    <main className={styles.page}>
      <div className={styles.locked}>
        <h1 className={styles.lockedTitle}>Sell products from your site</h1>
        <p className={styles.lockedBody}>
          Turn on the store to add products, group them into collections, take
          orders through Stripe, and manage shipping — all from this admin.
        </p>
        {isOwner ? (
          <Button variant="accent" size="md" onClick={enable} loading={pending}>
            Enable store
          </Button>
        ) : (
          <p className={styles.faint}>Ask an owner to enable the store.</p>
        )}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    </main>
  );
}
