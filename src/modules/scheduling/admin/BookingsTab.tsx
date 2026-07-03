"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntityList, type EntityListColumn } from "@/components/admin/EntityList";
import { Seg } from "@/components/admin/Seg";
import type { BookingListItem, BookingSegment } from "../queries";
import { BookingDetailSheet } from "./BookingDetailSheet";
import styles from "./scheduling.module.css";

const columns: EntityListColumn<BookingListItem>[] = [
  {
    key: "when",
    header: "When",
    render: (b) => (
      <span className={styles.mono}>
        {b.date} · {b.time}
      </span>
    ),
  },
  { key: "location", header: "Location", render: (b) => b.location || "—" },
  {
    key: "gcal",
    header: "Calendar",
    render: (b) => (b.googleEventId ? "Synced" : "—"),
  },
];

/**
 * Bookings tab: upcoming/past/cancelled segments + a detail sheet. The segment
 * is URL-driven so the server can re-query; the sheet opens client-side.
 */
export function BookingsTab({
  bookings,
  segment,
  counts,
}: {
  bookings: BookingListItem[];
  segment: BookingSegment;
  counts: Record<BookingSegment, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<BookingListItem | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Seg
        value={segment}
        onChange={(v) => router.push(`/admin/scheduling?tab=bookings&seg=${v}`)}
        options={[
          { value: "upcoming", label: `Upcoming (${counts.upcoming})` },
          { value: "past", label: `Past (${counts.past})` },
          { value: "cancelled", label: `Cancelled (${counts.cancelled})` },
        ]}
      />

      {open ? (
        <BookingDetailSheet
          booking={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      ) : null}

      <EntityList
        items={bookings}
        getId={(b) => b.id}
        columns={columns}
        getTitle={(b) => b.personName || b.personEmail || "Guest"}
        getSubtitle={(b) => b.eventName}
        searchValues={(b) => [b.personName, b.personEmail, b.eventName, b.code]}
        onRowClick={(b) => setOpen(b)}
        emptyLabel="No bookings in this view yet."
        noun="Booking"
      />
    </div>
  );
}
