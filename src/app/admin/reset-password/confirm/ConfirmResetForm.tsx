"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { confirmPasswordReset, type ConfirmResetState } from "@/modules/auth/reset-actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/** Set a new password from a reset-link token — mirrors LoginForm's layout/pattern. */
export function ConfirmResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ConfirmResetState, FormData>(
    confirmPasswordReset,
    {},
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  if (!token) {
    return (
      <div style={{ width: "var(--width-form)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          This reset link is missing its token. Request a new one.
        </p>
        <Link href="/admin/reset-password" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          ← Request a new link
        </Link>
      </div>
    );
  }

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
        Set a new password
      </h1>
      <input type="hidden" name="token" value={token} />
      <Input
        type="password"
        name="password"
        placeholder="New password"
        autoComplete="new-password"
        required
        minLength={8}
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        invalid={!!state.error}
      />
      <Input
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        invalid={mismatch}
      />
      {mismatch ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>Passwords don&apos;t match.</p>
      ) : null}
      {state.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{state.error}</p>
      ) : null}
      <Button type="submit" loading={pending} disabled={mismatch || password.length < 8} style={{ width: "100%" }}>
        Set password
      </Button>
    </form>
  );
}
