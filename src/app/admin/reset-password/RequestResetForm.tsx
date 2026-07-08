"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type RequestResetState } from "@/modules/auth/reset-actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/** Request a password-reset email — mirrors LoginForm's layout/pattern. */
export function RequestResetForm() {
  const [state, formAction, pending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.message) {
    return (
      <div
        style={{
          width: "var(--width-form)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <h1
          style={{
            margin: "0 0 var(--space-2)",
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-sm)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-widest)",
            color: "var(--text-muted)",
          }}
        >
          Check your email
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text)" }}>{state.message}</p>
        <Link href="/admin/login" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          ← Back to login
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
        Reset password
      </h1>
      <Input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="username"
        required
        autoFocus
        invalid={!!state.error}
      />
      {state.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{state.error}</p>
      ) : null}
      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Send reset link
      </Button>
      <Link href="/admin/login" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        ← Back to login
      </Link>
    </form>
  );
}
