"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/core/Button";
import { startMembershipCheckout, openBillingPortal } from "../actions";
import styles from "./membership.module.css";

/** What the viewer can do with a tier, decided server-side and passed down. */
export type CtaMode = "join" | "manage" | "signin";

/**
 * The pricing CTA. One island per tier. The MODE is resolved on the server
 * from the session viewer (member -> manage, signed-in non-member -> join,
 * anonymous -> sign in) so the client never decides access. Actions return a
 * hosted Stripe URL which we navigate to; errors surface inline.
 */
export function JoinButton({
  mode,
  tierSlug,
  tierName,
  featured,
}: {
  mode: CtaMode;
  tierSlug: string;
  tierName: string;
  featured: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (mode === "signin") {
    return (
      <Link className={styles.cta} data-featured={featured || undefined} href="/join">
        Sign in to join
      </Link>
    );
  }

  const run = () =>
    startTransition(async () => {
      setError(null);
      const res = mode === "manage"
        ? await openBillingPortal()
        : await startMembershipCheckout(tierSlug);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      if (res.redirect) {
        window.location.href = res.redirect;
        return;
      }
      setError(res.error ?? "Something went wrong.");
    });

  return (
    <div className={styles.ctaWrap}>
      <Button
        variant={featured ? "accent" : "outline"}
        size="sm"
        onClick={run}
        loading={pending}
      >
        {mode === "manage" ? "Manage membership" : `Join ${tierName}`}
      </Button>
      {error ? <p className={styles.ctaError}>{error}</p> : null}
    </div>
  );
}
