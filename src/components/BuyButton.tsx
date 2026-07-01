"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type Kind = "one_time" | "subscription" | "donation";

interface Props {
  kind: Kind;
  /** Required for one_time / subscription; ignored for donation. */
  priceId?: string;
  /** Attach a paid-post purchase. */
  postId?: string;
  label?: string;
  variant?: "accent" | "outline" | "ghost";
}

/** Reusable purchase button. POSTs to /api/checkout and redirects the browser to the returned
 * Stripe Checkout URL (the current recommended flow — no client-side Stripe.js needed). Works
 * for one-time, subscription, and donation. Resilient: shows a clear error, never leaves the
 * user stuck in a spinner. */
export function BuyButton({ kind, priceId, postId, label, variant = "accent" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, priceId, postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Could not start checkout.");
      setBusy(false);
    } catch {
      setError("Could not start checkout.");
      setBusy(false);
    }
  }

  const defaultLabel = kind === "donation" ? "Donate" : kind === "subscription" ? "Subscribe" : "Buy";

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <Button onClick={go} variant={variant} disabled={busy}>
        {busy ? "Redirecting…" : label || defaultLabel}
      </Button>
      {error && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span>}
    </span>
  );
}
