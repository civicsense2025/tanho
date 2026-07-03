"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePerson } from "../admin-actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import styles from "./profile.module.css";

type ContactFields = {
  email: string;
  phone: string;
  company: string;
  location: string;
};

/** Editable contact fields (editor-level). Saves via updatePerson. */
export function ContactCard({
  personId,
  initial,
}: {
  personId: string;
  initial: ContactFields;
}) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (k: keyof ContactFields, v: string) => setC((p) => ({ ...p, [k]: v }));

  const save = () =>
    startTransition(async () => {
      const res = await updatePerson(personId, c);
      setFlash(res.ok ? "Saved ✓" : res.error);
      if (res.ok) {
        setTimeout(() => setFlash(null), 1600);
        router.refresh();
      }
    });

  return (
    <section className={styles.card}>
      <h3 className={styles.cardHead}>Contact</h3>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Email</span>
          <Input value={c.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Phone</span>
          <Input value={c.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Company</span>
          <Input value={c.company} onChange={(e) => set("company", e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Location</span>
          <Input value={c.location} onChange={(e) => set("location", e.target.value)} />
        </label>
      </div>
      <div className={styles.cardActions}>
        {flash ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        ) : null}
        <Button size="sm" variant="accent" onClick={save} loading={pending}>
          Save
        </Button>
      </div>
    </section>
  );
}
