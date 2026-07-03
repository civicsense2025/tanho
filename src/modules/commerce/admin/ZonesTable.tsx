"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { centsToDollars, dollarsToCents } from "../money";
import {
  createShippingZone,
  deleteShippingZone,
  updateShippingZone,
} from "../shipping-actions";
import type { ShippingZoneRow } from "../queries";
import styles from "./commerce.module.css";

type Draft = { name: string; method: "flat" | "weight"; rate: string; perLb: string; freeOver: string };

const toDraft = (z: ShippingZoneRow): Draft => ({
  name: z.name,
  method: z.method,
  rate: centsToDollars(z.rateCents),
  perLb: centsToDollars(z.perLbCents),
  freeOver: z.freeOverCents != null ? centsToDollars(z.freeOverCents) : "",
});

const payload = (d: Draft) => ({
  name: d.name,
  method: d.method,
  rateCents: dollarsToCents(d.rate),
  perLbCents: dollarsToCents(d.perLb),
  freeOverCents: d.freeOver.trim() ? dollarsToCents(d.freeOver) : null,
  countries: [] as string[],
});

const EMPTY: Draft = { name: "", method: "flat", rate: "", perLb: "", freeOver: "" };

/** Shipping zones table with inline add/edit/remove. */
export function ZonesTable({ zones, onChange }: { zones: ShippingZoneRow[]; onChange: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(zones.map((z) => [z.id, toDraft(z)])),
  );
  const [nu, setNu] = useState<Draft>(EMPTY);
  const [, startTransition] = useTransition();

  const setField = (id: string, k: keyof Draft, v: string) =>
    setDrafts((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

  const save = (id: string) =>
    startTransition(async () => {
      await updateShippingZone(id, payload(drafts[id]));
      onChange();
    });
  const remove = (id: string) =>
    startTransition(async () => {
      await deleteShippingZone(id);
      onChange();
    });
  const add = () =>
    startTransition(async () => {
      if (!nu.name.trim()) return;
      await createShippingZone(payload(nu));
      setNu(EMPTY);
      onChange();
    });

  const methodSel = (val: Draft["method"], set: (v: Draft["method"]) => void) => (
    <Select value={val} onChange={(e) => set(e.target.value as Draft["method"])}>
      <option value="flat">Flat</option>
      <option value="weight">By weight</option>
    </Select>
  );

  return (
    <table className={styles.zoneTable}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Method</th>
          <th>Rate</th>
          <th>Per lb</th>
          <th>Free over</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {zones.map((z) => {
          const d = drafts[z.id] ?? toDraft(z);
          return (
            <tr key={z.id}>
              <td><Input value={d.name} onChange={(e) => setField(z.id, "name", e.target.value)} /></td>
              <td>{methodSel(d.method, (v) => setField(z.id, "method", v))}</td>
              <td><Input value={d.rate} onChange={(e) => setField(z.id, "rate", e.target.value)} /></td>
              <td><Input value={d.perLb} onChange={(e) => setField(z.id, "perLb", e.target.value)} /></td>
              <td><Input value={d.freeOver} onChange={(e) => setField(z.id, "freeOver", e.target.value)} /></td>
              <td style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button variant="outline" size="sm" onClick={() => save(z.id)}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(z.id)}>Remove</Button>
              </td>
            </tr>
          );
        })}
        <tr>
          <td><Input value={nu.name} onChange={(e) => setNu((p) => ({ ...p, name: e.target.value }))} placeholder="New zone" /></td>
          <td>{methodSel(nu.method, (v) => setNu((p) => ({ ...p, method: v })))}</td>
          <td><Input value={nu.rate} onChange={(e) => setNu((p) => ({ ...p, rate: e.target.value }))} placeholder="0.00" /></td>
          <td><Input value={nu.perLb} onChange={(e) => setNu((p) => ({ ...p, perLb: e.target.value }))} placeholder="0.00" /></td>
          <td><Input value={nu.freeOver} onChange={(e) => setNu((p) => ({ ...p, freeOver: e.target.value }))} placeholder="—" /></td>
          <td><Button variant="accent" size="sm" onClick={add}>Add</Button></td>
        </tr>
      </tbody>
    </table>
  );
}
