"use client";

import { useState, useTransition } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { startDonationCheckout } from "../checkout-actions";

/**
 * Just collects an email — the donation amount is chosen on Stripe's own
 * Checkout page (custom_unit_amount), not here. See checkout-actions.ts.
 */
export function DonateForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await startDonationCheckout({ email: email || undefined });
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "26rem" }}>
      <Field label="Email">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      <Button variant="accent" onClick={submit} loading={pending}>
        Continue to donate
      </Button>
      {error ? <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p> : null}
    </div>
  );
}
