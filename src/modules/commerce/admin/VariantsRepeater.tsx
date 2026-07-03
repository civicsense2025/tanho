"use client";

import { useState, useTransition } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { centsToDollars, dollarsToCents } from "../money";
import { addVariant, removeVariant, updateVariant } from "../product-actions";
import type { VariantRow } from "../queries";
import styles from "./commerce.module.css";

type Draft = { label: string; price: string; inventory: string; sku: string };

const toDraft = (v: VariantRow): Draft => ({
  label: v.label,
  price: centsToDollars(v.priceCents),
  inventory: String(v.inventory),
  sku: v.sku,
});

const payload = (d: Draft) => ({
  label: d.label,
  priceCents: dollarsToCents(d.price),
  inventory: Math.max(0, parseInt(d.inventory || "0", 10) || 0),
  sku: d.sku,
});

/** Variant repeater. Each variant persists via its own server action. */
export function VariantsRepeater({
  productId,
  variants,
  onChange,
}: {
  productId: string;
  variants: VariantRow[];
  onChange: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, toDraft(v)])),
  );
  const [newDraft, setNewDraft] = useState<Draft>({ label: "", price: "", inventory: "0", sku: "" });
  const [, startTransition] = useTransition();

  const setField = (id: string, k: keyof Draft, val: string) =>
    setDrafts((p) => ({ ...p, [id]: { ...p[id], [k]: val } }));

  const save = (id: string) =>
    startTransition(async () => {
      await updateVariant(id, payload(drafts[id]));
      onChange();
    });

  const remove = (id: string) =>
    startTransition(async () => {
      await removeVariant(id);
      onChange();
    });

  const add = () =>
    startTransition(async () => {
      if (!newDraft.label.trim()) return;
      await addVariant(productId, payload(newDraft));
      setNewDraft({ label: "", price: "", inventory: "0", sku: "" });
      onChange();
    });

  return (
    <div className={styles.repeater}>
      {variants.map((v) => {
        const d = drafts[v.id] ?? toDraft(v);
        return (
          <div key={v.id} className={styles.repeatRow}>
            <Field label="Label">
              <Input value={d.label} onChange={(e) => setField(v.id, "label", e.target.value)} />
            </Field>
            <Field label="Price">
              <Input value={d.price} onChange={(e) => setField(v.id, "price", e.target.value)} />
            </Field>
            <Field label="Inventory">
              <Input
                type="number"
                value={d.inventory}
                onChange={(e) => setField(v.id, "inventory", e.target.value)}
              />
            </Field>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button variant="outline" size="sm" onClick={() => save(v.id)}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(v.id)}>
                Remove
              </Button>
            </div>
          </div>
        );
      })}

      <div className={styles.repeatRow}>
        <Field label="New label">
          <Input
            value={newDraft.label}
            onChange={(e) => setNewDraft((p) => ({ ...p, label: e.target.value }))}
            placeholder="e.g. Large"
          />
        </Field>
        <Field label="Price">
          <Input
            value={newDraft.price}
            onChange={(e) => setNewDraft((p) => ({ ...p, price: e.target.value }))}
          />
        </Field>
        <Field label="Inventory">
          <Input
            type="number"
            value={newDraft.inventory}
            onChange={(e) => setNewDraft((p) => ({ ...p, inventory: e.target.value }))}
          />
        </Field>
        <Button variant="accent" size="sm" onClick={add}>
          Add variant
        </Button>
      </div>
    </div>
  );
}
