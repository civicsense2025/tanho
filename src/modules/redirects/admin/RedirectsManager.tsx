"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Section } from "@/components/admin/Section";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { deleteRedirect, saveRedirect } from "../actions";
import type { RedirectRow } from "../queries";
import styles from "./redirects.module.css";

type Draft = { id: string | null; fromPath: string; toPath: string; code: 301 | 302 };
const empty = (): Draft => ({ id: null, fromPath: "", toPath: "", code: 301 });

/** Redirects table with an inline add/edit form. Owner-gated actions. */
export function RedirectsManager({ redirects }: { redirects: RedirectRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(empty());
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveRedirect(draft.id, draft);
      if (res.error) setFlash(res.error);
      else {
        setDraft(empty());
        setFlash(null);
        router.refresh();
      }
    });

  const remove = (id: string) =>
    startTransition(async () => {
      await deleteRedirect(id);
      if (draft.id === id) setDraft(empty());
      router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <Section title={draft.id ? "Edit redirect" : "Add redirect"}>
        <div className={styles.editGrid}>
          <Field label="From (path)">
            <Input
              value={draft.fromPath}
              placeholder="/old-url"
              onChange={(e) => setDraft((d) => ({ ...d, fromPath: e.target.value }))}
            />
          </Field>
          <Field label="To (path)">
            <Input
              value={draft.toPath}
              placeholder="/new-url"
              onChange={(e) => setDraft((d) => ({ ...d, toPath: e.target.value }))}
            />
          </Field>
          <Field label="Code">
            <Select
              value={String(draft.code)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, code: Number(e.target.value) as 301 | 302 }))
              }
            >
              <option value="301">301</option>
              <option value="302">302</option>
            </Select>
          </Field>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {draft.id ? (
              <Button variant="ghost" size="sm" onClick={() => setDraft(empty())}>
                Cancel
              </Button>
            ) : null}
            <Button variant="accent" size="sm" onClick={save} loading={pending}>
              {draft.id ? "Save" : "Add"}
            </Button>
          </div>
        </div>
        {flash ? (
          <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
            {flash}
          </p>
        ) : null}
      </Section>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Code</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {redirects.length === 0 ? (
            <tr>
              <td colSpan={4} className={styles.empty}>
                No redirects yet.
              </td>
            </tr>
          ) : (
            redirects.map((r) => (
              <tr key={r.id}>
                <td className={styles.path}>{r.fromPath}</td>
                <td className={styles.path}>{r.toPath}</td>
                <td className={styles.code}>{r.code}</td>
                <td>
                  <div className={styles.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft({
                          id: r.id,
                          fromPath: r.fromPath,
                          toPath: r.toPath,
                          code: r.code === 302 ? 302 : 301,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
