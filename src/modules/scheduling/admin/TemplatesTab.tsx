"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import type { TemplatesSettings } from "../validation";
import { saveTemplates } from "../admin-actions";
import { renderTemplate, templateVars, TEMPLATE_PLACEHOLDERS } from "../templates";
import styles from "./scheduling.module.css";

/** A sample var set so the live preview shows realistic copy. */
const SAMPLE = templateVars({
  name: "Alex Rivera",
  email: "alex@example.com",
  eventName: "Intro call",
  date: "2026-07-06",
  time: "10:00",
  tz: "UTC",
  location: "zoom",
  manageUrl: "https://example.com/book/manage/AB12CD34",
});

/** Templates tab — editable copy with placeholder chips + live preview. */
export function TemplatesTab({ templates }: { templates: TemplatesSettings }) {
  const router = useRouter();
  const [t, setT] = useState(templates);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof TemplatesSettings>(key: K, value: string) =>
    setT((cur) => ({ ...cur, [key]: value }));

  const save = async () => {
    setPending(true);
    setError(null);
    setNotice(null);
    const res = await saveTemplates(t);
    setPending(false);
    if (res.ok) {
      setNotice("Templates saved.");
      router.refresh();
    } else setError(res.error);
  };

  const field = (label: string, key: keyof TemplatesSettings, area = true) => (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {area ? (
        <Textarea
          className={styles.textarea}
          value={t[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <Input value={t[key]} onChange={(e) => set(key, e.target.value)} />
      )}
      <span className={styles.preview}>{renderTemplate(t[key], SAMPLE)}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className={styles.card}>
        <h3 className={styles.cardHead}>Placeholders</h3>
        <div className={styles.chips}>
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <span key={p} className={styles.chip}>{`{{${p}}}`}</span>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHead}>Confirmation email</h3>
        {field("Subject", "emailConfirmSubject", false)}
        {field("Body", "emailConfirm")}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHead}>Reminder email</h3>
        {field("Subject", "emailReminderSubject", false)}
        {field("Body", "emailReminder")}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHead}>SMS</h3>
        {field("Message", "sms")}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHead}>Confirmation page</h3>
        {field("Copy", "page")}
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
      {notice ? <span className={styles.notice}>{notice}</span> : null}
      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save templates
        </Button>
      </div>
    </div>
  );
}
