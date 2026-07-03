"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import type { EventTypeRow } from "../queries";
import { saveEventType } from "../admin-actions";
import { EventTypeCard } from "./EventTypeCard";
import styles from "./scheduling.module.css";

/** Event types tab — inline-editable cards + create. */
export function EventTypesTab({ events }: { events: EventTypeRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    setCreating(true);
    // A neutral draft the owner then edits inline.
    const res = await saveEventType(null, {
      name: "New event type",
      slug: `event-${Date.now().toString(36)}`,
      active: false,
      durationMin: 30,
      priceCents: 0,
      color: "accent",
      description: "",
      locations: ["zoom"],
      formId: null,
    });
    setCreating(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className={styles.headerRow}>
        <span style={{ flex: 1 }} />
        <Button variant="accent" size="sm" onClick={create} loading={creating}>
          + Event type
        </Button>
      </div>
      {error ? <span className={styles.error}>{error}</span> : null}

      {events.length === 0 ? (
        <p className={styles.faint}>No event types yet. Create your first one.</p>
      ) : (
        <div className={styles.cardGrid}>
          {events.map((e) => (
            <EventTypeCard key={e.id} event={e} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}
