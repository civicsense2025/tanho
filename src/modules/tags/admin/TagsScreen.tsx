"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTag } from "../actions";
import type { TagWithCount } from "../queries";
import { Section } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { TagRow } from "./TagRow";
import styles from "./tags.module.css";

/** The Content → Tags screen: usage-counted list + add-tag row. */
export function TagsScreen({ initial }: { initial: TagWithCount[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const add = () =>
    startTransition(async () => {
      const res = await createTag({ name });
      if (!res.ok) setError(res.error);
      else {
        setName("");
        setError(null);
        refresh();
      }
    });

  return (
    <Section title="Tags" desc="Shared labels across content, with live usage counts.">
      <div className={styles.list}>
        {initial.length === 0 ? (
          <div className={styles.empty}>No tags yet. Add one below.</div>
        ) : (
          initial.map((t) => <TagRow key={t.id} tag={t} onChanged={refresh} />)
        )}
        <div className={styles.addRow}>
          <Input
            value={name}
            placeholder="New tag name"
            invalid={!!error}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          {error ? <span className={styles.error}>{error}</span> : null}
          <Button variant="accent" size="sm" onClick={add} loading={pending}>
            Add tag
          </Button>
        </div>
      </div>
    </Section>
  );
}
