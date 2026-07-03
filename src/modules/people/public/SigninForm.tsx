"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signinAction, type AuthState } from "../account-actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import styles from "./auth.module.css";

/** Reader sign-in — mirrors the admin LoginForm with reader credentials. */
export function SigninForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signinAction,
    {},
  );
  return (
    <form action={formAction} className={styles.form}>
      <h1 className={styles.eyebrow}>Sign in</h1>
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
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Sign in
      </Button>
      <p className={styles.alt}>
        No account? <Link href="/join">Create one</Link>
      </p>
    </form>
  );
}
