"use client";

import { useActionState } from "react";
import { subscribeAction, type SubscribeState } from "../newsletter-actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import styles from "./subscribe.module.css";

/**
 * Newsletter subscribe island. Used by the newsletter block's Render (which
 * stays pure) — the interactive form lives here and posts to subscribeAction.
 */
export function SubscribeForm({
  list,
  placeholder,
  cta,
}: {
  list: string;
  placeholder: string;
  cta: string;
}) {
  const [state, formAction, pending] = useActionState<SubscribeState, FormData>(
    subscribeAction,
    {},
  );
  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="list" value={list} />
      <div className={styles.row}>
        <Input
          type="email"
          name="email"
          placeholder={placeholder}
          autoComplete="email"
          required
          invalid={!!state.error}
        />
        <Button type="submit" variant="accent" loading={pending}>
          {cta}
        </Button>
      </div>
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.notice ? <p className={styles.notice}>{state.notice}</p> : null}
    </form>
  );
}
