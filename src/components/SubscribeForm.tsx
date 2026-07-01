"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";

/** Public subscribe form. Posts to /api/subscribe (double-opt-in). Kept deliberately small and
 * resilient: it never assumes success, shows a clear pending/confirmation state, and surfaces a
 * generic error without leaking whether an email already exists (enumeration-safe). */
export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p style={{ fontSize: "var(--text-sm)", color: "var(--success)" }}>
        Almost there — check your inbox to confirm your subscription.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ minWidth: "16rem" }}
        aria-label="Email address"
      />
      <Button type="submit" variant="accent" size="sm" disabled={state === "loading"}>
        {state === "loading" ? "Subscribing…" : "Subscribe"}
      </Button>
      {state === "error" && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>Something went wrong. Try again.</span>
      )}
    </form>
  );
}
