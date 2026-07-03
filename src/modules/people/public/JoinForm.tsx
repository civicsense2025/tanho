"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinAction, type AuthState } from "../account-actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import styles from "./auth.module.css";

/**
 * Reader signup. When sign-ups are invite-only the page renders the closed
 * state instead of this form (server-decided in the route).
 */
export function JoinForm({ open }: { open: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    joinAction,
    {},
  );

  if (!open) {
    return (
      <div className={styles.form}>
        <h1 className={styles.eyebrow}>Join</h1>
        <p className={styles.closed}>
          Sign-ups are invite-only right now. If you have an invitation, use the
          link in your email.
        </p>
        <p className={styles.alt}>
          Already a member? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <h1 className={styles.eyebrow}>Create account</h1>
      <Input name="name" placeholder="Name" autoComplete="name" required autoFocus />
      <Input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        required
        invalid={!!state.error}
      />
      <Input
        type="password"
        name="password"
        placeholder="Password (8+ characters)"
        autoComplete="new-password"
        minLength={8}
        required
        invalid={!!state.error}
      />
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.notice ? <p className={styles.notice}>{state.notice}</p> : null}
      <Button type="submit" loading={pending} style={{ width: "100%" }}>
        Create account
      </Button>
      <p className={styles.alt}>
        Already a member? <Link href="/signin">Sign in</Link>
      </p>
    </form>
  );
}
