"use client";

import { useActionState } from "react";
import { verifyMfaAction, type VerifyMfaState } from "@/modules/auth/mfa/actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/**
 * MFA challenge form — shown after password verification succeeds but the
 * account requires a second factor. Accepts a 6-digit TOTP code OR a backup
 * code (the server action tries TOTP first, then falls back to backup code
 * using the same input). The pending MFA session is read from a cookie by the
 * server action — no token needs to be passed through the form.
 */
export function MfaChallengeForm() {
  const [state, formAction, pending] = useActionState<VerifyMfaState, FormData>(
    verifyMfaAction,
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
        Two-factor authentication
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <label htmlFor="code" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Authentication code
        </label>
        <Input
          id="code"
          type="text"
          name="code"
          placeholder="123456 or backup code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          invalid={!!state.error}
        />
      </div>

      {state.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {state.error}
        </p>
      ) : null}

      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Verify &amp; sign in
      </Button>
    </form>
  );
}
