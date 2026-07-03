"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import type { BookFlowEvent } from "./BookFlow";
import { humanDate } from "./dates";
import styles from "./book.module.css";

/** Right-hand intake panel — collects name/email/phone and location. */
export function IntakePanel({
  event,
  active,
  time,
  date,
  location,
  onLocation,
  pending,
  onSubmit,
}: {
  event: BookFlowEvent;
  active: boolean;
  time: string | null;
  date: string;
  location: string;
  onLocation: (v: string) => void;
  pending: boolean;
  onSubmit: (f: { name: string; email: string; phone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  if (!active) {
    return (
      <div className={styles.panel}>
        <span className={styles.eyebrow}>Your details</span>
        <span className={styles.empty}>Pick a time to continue.</span>
      </div>
    );
  }

  return (
    <form
      className={styles.panel}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, email, phone });
      }}
    >
      <span className={styles.eyebrow}>Your details</span>
      <p className={styles.cardMeta}>
        {event.name} · {humanDate(date)} at {time}
      </p>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Email</span>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Phone (optional)</span>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
      </label>
      {event.locations.length > 1 ? (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Location</span>
          <select
            value={location}
            onChange={(e) => onLocation(e.target.value)}
            className={styles.navBtn}
          >
            {event.locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button type="submit" variant="accent" loading={pending}>
        Confirm booking
      </Button>
    </form>
  );
}
