"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/modules/auth/actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/** Centered login — the design's AdminLogin, with real credentials. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
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
        Admin
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
      <Input
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        invalid={!!state.error}
      />
      {state.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {state.error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Enter
      </Button>
      <Link
        href="/admin/reset-password"
        style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", alignSelf: "center" }}
      >
        Forgot password?
      </Link>
    </form>
  );
}
