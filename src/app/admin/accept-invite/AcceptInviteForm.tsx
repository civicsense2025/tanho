"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/modules/team/actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/**
 * Accept-invite form — public page (no session). The token arrives via
 * `searchParams.token` and is passed as a hidden field so the server action
 * can verify it. Only the password is set by the user; the name was chosen at
 * invite time.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<{ error?: string }, FormData>(
    acceptInvite,
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
      <h1
        style={{
          margin: "0 0 var(--space-5)",
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-sm)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-widest)",
          color: "var(--text-muted)",
        }}
      >
        Accept your invite
      </h1>

      <input type="hidden" name="token" value={token} />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <label htmlFor="password" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Password (at least 12 characters)
        </label>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Choose a password"
          autoComplete="new-password"
          minLength={12}
          required
          autoFocus
          invalid={!!state.error}
        />
      </div>

      {state.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {state.error}
        </p>
      ) : null}

      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Accept invite &amp; sign in
      </Button>
    </form>
  );
}
