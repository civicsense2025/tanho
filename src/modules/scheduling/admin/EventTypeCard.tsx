"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Toggle } from "@/components/admin/Seg";
import type { EventTypeRow } from "../queries";
import { saveEventType, deleteEventType } from "../admin-actions";
import { LOCATIONS } from "../validation";
import styles from "./scheduling.module.css";

/** An inline-editable event type card (name, slug, active, minutes, price…). */
export function EventTypeCard({
  event,
  onChanged,
}: {
  event: EventTypeRow;
  onChanged: () => void;
}) {
  const [name, setName] = useState(event.name);
  const [slug, setSlug] = useState(event.slug);
  const [active, setActive] = useState(event.active);
  const [durationMin, setDuration] = useState(event.durationMin);
  const [priceDollars, setPrice] = useState((event.priceCents / 100).toString());
  const [locations, setLocations] = useState<string[]>(event.locations);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleLoc = (loc: string) =>
    setLocations((cur) =>
      cur.includes(loc) ? cur.filter((l) => l !== loc) : [...cur, loc],
    );

  const save = async () => {
    setPending(true);
    setError(null);
    const res = await saveEventType(event.id, {
      name,
      slug,
      active,
      durationMin,
      priceCents: Math.round(Number(priceDollars || "0") * 100),
      color: event.color,
      description: event.description,
      locations,
      formId: event.formId,
    });
    setPending(false);
    if (res.ok) onChanged();
    else setError(res.error);
  };

  const remove = async () => {
    setPending(true);
    const res = await deleteEventType(event.id);
    setPending(false);
    if (res.ok) onChanged();
    else setError(res.error);
  };

  return (
    <div className={styles.card}>
      <div className={styles.rowGrid}>
        <span className={styles.label}>Name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        <span className={styles.label}>Slug</span>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={120} />
        <span className={styles.label}>Active</span>
        <Toggle value={active} onChange={setActive} on="Live" off="Off" />
        <span className={styles.label}>Minutes</span>
        <Select value={String(durationMin)} onChange={(e) => setDuration(Number(e.target.value))}>
          {[15, 30, 45, 60, 90].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <span className={styles.label}>Price ($)</span>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={priceDollars}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <span className={styles.label}>Locations</span>
      <div className={styles.chips}>
        {LOCATIONS.map((loc) => (
          <button
            key={loc}
            type="button"
            className={`${styles.chip} ${locations.includes(loc) ? styles.chipOn : ""}`}
            onClick={() => toggleLoc(loc)}
          >
            {loc}
          </button>
        ))}
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={remove}>
          Delete
        </Button>
      </div>
    </div>
  );
}
