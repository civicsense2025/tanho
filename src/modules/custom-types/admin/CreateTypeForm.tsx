"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCustomType } from "../actions";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { slugify } from "./slug";
import styles from "./types.module.css";

/** Create a new custom type from a display name (slug derived, no fields yet). */
export function CreateTypeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const slug = slugify(name);

  const create = () =>
    startTransition(async () => {
      const res = await saveCustomType({ slug, name, fields: [], enabled: true });
      if (!res.ok) setError(res.error);
      else {
        setName("");
        setError(null);
        router.refresh();
      }
    });

  return (
    <div className={styles.fieldRow}>
      <Input
        className={styles.grow}
        placeholder="New content type name"
        value={name}
        invalid={!!error}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      {slug ? <span className={styles.slug}>custom:{slug}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
      <Button variant="accent" size="sm" onClick={create} loading={pending} disabled={!slug}>
        Create
      </Button>
    </div>
  );
}
