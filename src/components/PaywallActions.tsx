"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import { BuyButton } from "@/components/BuyButton";

/**
 * Actions shown inside a paid post's paywall when payments are enabled:
 *  - Subscribe (BuyButton → Stripe Checkout, subscription mode) for new readers.
 *  - "Already a subscriber? Unlock" — posts the email to /api/unlock, which (for an active
 *    subscriber) EMAILS a magic link. Clicking it sets the httpOnly post_access cookie. We never
 *    mint access from a plaintext email here — inbox control is the ownership proof.
 *
 * The subscription price id is instance config (the owner's Stripe price), read from a public
 * env var. If unset, only the unlock path shows (the owner can still gate via a Payment Link).
 */
export function PaywallActions() {
  const priceId = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Enumeration-safe: a 200 doesn't confirm membership. We always show the same "check your
      // email" message on success so the UI never reveals whether the address has a subscription.
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {priceId && (
        <div>
          <BuyButton kind="subscription" priceId={priceId} label="Subscribe" />
        </div>
      )}
      {state === "sent" ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--success)" }}>
          If that email has an active subscription, we&apos;ve sent an unlock link. Check your inbox.
        </p>
      ) : (
        <form onSubmit={unlock} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <Input
            type="email"
            required
            placeholder="Already subscribed? Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ minWidth: "16rem" }}
            aria-label="Subscriber email to unlock"
          />
          <Button type="submit" variant="outline" size="sm" disabled={state === "loading"}>
            {state === "loading" ? "Sending…" : "Email me an unlock link"}
          </Button>
          {state === "error" && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Something went wrong. Try again.
            </span>
          )}
        </form>
      )}
    </div>
  );
}
