"use client";

import { useActionState } from "react";
import { createFirstOwner, type FirstOwnerState } from "@/modules/auth/first-owner";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/**
 * First-run install form — the web equivalent of the CLI `seedOwner`. Same
 * FormData/useActionState shape as LoginForm; on success the action creates the
 * owner, logs them in, and redirects into the setup wizard.
 */
export function InstallForm() {
  const [state, formAction, pending] = useActionState<FirstOwnerState, FormData>(
    createFirstOwner,
    {},
  );
  return (
    <form
      action={formAction}
      style={{
        width: "var(--width-form)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div style={{ marginBottom: "var(--space-2)" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-sm)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-widest)",
            color: "var(--text-muted)",
          }}
        >
          Set up your site
        </h1>
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Create the owner account. This is a one-time step — your site stays
          private to visitors until it&apos;s done.
        </p>
      </div>
      <Input
        type="text"
        name="name"
        placeholder="Your name"
        autoComplete="name"
        required
        autoFocus
        invalid={!!state.error}
      />
      <Input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="username"
        required
        invalid={!!state.error}
      />
      <Input
        type="password"
        name="password"
        placeholder="Password (at least 12 characters)"
        autoComplete="new-password"
        minLength={12}
        required
        invalid={!!state.error}
      />
      {state.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {state.error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Create owner &amp; continue
      </Button>
    </form>
  );
}
