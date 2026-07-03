"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePerson } from "../admin-actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import styles from "./profile.module.css";

/** Internal notes + a simple comma-separated tag editor. Saves via updatePerson. */
export function NotesEditor({
  personId,
  initialNotes,
  initialTags,
}: {
  personId: string;
  initialNotes: string;
  initialTags: string[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState(initialTags.join(", "));
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await updatePerson(personId, { notes, tags: parsedTags });
      setFlash(res.ok ? "Saved ✓" : res.error);
      if (res.ok) {
        setTimeout(() => setFlash(null), 1600);
        router.refresh();
      }
    });

  return (
    <section className={styles.card}>
      <h3 className={styles.cardHead}>Internal notes</h3>
      <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <label className={styles.field} style={{ marginTop: "var(--space-3)" }}>
        <span>Tags (comma-separated)</span>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} />
      </label>
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
