"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { submitForm } from "../submit-actions";
import { HONEYPOT_FIELD, type SubmitState } from "../submission-schema";
import { isScreen } from "../field-kinds";
import type { FormField, FormDesign, FormSettings } from "../validation";
import { FieldControl } from "./FieldControl";
import styles from "./form.module.css";

export type PublicForm = {
  id: string;
  name: string;
  fields: FormField[];
  design: FormDesign;
  settings: FormSettings;
  /** Server-resolved (payments.isConfigured()) — gates the "payment" field. */
  paymentsEnabled: boolean;
};

/**
 * The public, interactive form. Pure block Render stays server-side; this
 * island owns submission. Two layouts share one field renderer:
 * classic (all fields on one page) and conversational (one field per screen
 * with a progress bar). Always includes the honeypot hidden field; the server
 * re-validates every value, so the client is a convenience, not a gate.
 */
export function FormRenderer({ form }: { form: PublicForm }) {
  const [state, setState] = useState<SubmitState | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  const conversational = form.design.layout === "conversational";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await submitForm(form.id, new FormData(e.currentTarget));
    setPending(false);
    if (result.ok && result.redirect) {
      window.location.assign(result.redirect);
      return;
    }
    setState(result);
  }

  if (state?.ok) {
    return (
      <div className={styles.form} data-theme={form.design.theme}>
        <p className={styles.done}>{state.message ?? "Thanks — we got your response."}</p>
      </div>
    );
  }

  const visible = conversational
    ? form.fields.filter((_, i) => i === activeIndex(form.fields, step))
    : form.fields;
  const isLast = !conversational || step >= lastStepIndex(form.fields);

  return (
    <form
      onSubmit={onSubmit}
      className={styles.form}
      data-theme={form.design.theme}
      style={{ ["--form-accent" as string]: form.design.accent }}
    >
      {conversational ? <Progress step={step} total={inputCount(form.fields)} /> : null}

      {/* Honeypot — visually hidden, kept out of the tab order. Bots fill it. */}
      <div className={styles.honeypot} aria-hidden>
        <label>
          Leave this empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={styles.fields}>
        {visible.map((field) => (
          <FieldControl key={field.id} field={field} paymentsEnabled={form.paymentsEnabled} />
        ))}
      </div>

      {state && !state.ok ? <p className={styles.error}>{state.error}</p> : null}

      <div className={styles.actions}>
        {conversational && step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        {isLast ? (
          <Button type="submit" variant="accent" loading={pending}>
            {form.settings.submitLabel || "Submit"}
          </Button>
        ) : (
          <Button type="button" variant="accent" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        )}
      </div>
    </form>
  );
}

/** Progress bar for the conversational layout. */
function Progress({ step, total }: { step: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((step / total) * 100)) : 0;
  return (
    <div className={styles.progress} aria-hidden>
      <span className={styles.progressBar} style={{ width: `${pct}%` }} />
    </div>
  );
}

const inputCount = (fields: FormField[]) => fields.filter((f) => !isScreen(f.kind)).length;
const lastStepIndex = (fields: FormField[]) => Math.max(0, fields.length - 1);
const activeIndex = (fields: FormField[], step: number) =>
  Math.min(Math.max(step, 0), Math.max(0, fields.length - 1));
