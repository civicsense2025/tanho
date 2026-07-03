"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/core/Button";
import type { BookingListItem } from "../queries";
import { adminCancelBooking, resendConfirmation } from "../admin-actions";
import styles from "./scheduling.module.css";

/** Detail sheet for one booking — attendee, People link, answers, actions. */
export function BookingDetailSheet({
  booking,
  onClose,
  onChanged,
}: {
  booking: BookingListItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setPending(true);
    setError(null);
    const res = await resendConfirmation(booking.code);
    setPending(false);
    if (res.ok) setNotice("Confirmation re-sent.");
    else setError(res.error);
  };

  const cancel = async () => {
    setPending(true);
    setError(null);
    const res = await adminCancelBooking(booking.code);
    setPending(false);
    if (res.ok) onChanged();
    else setError(res.error);
  };

  return (
    <div className={styles.sheet}>
      <div className={styles.headerRow}>
        <h3 className={styles.cardHead}>Booking {booking.code}</h3>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.chip} onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.rowGrid}>
        <span className={styles.label}>Event</span>
        <span>{booking.eventName}</span>
        <span className={styles.label}>When</span>
        <span className={styles.mono}>
          {booking.date} · {booking.time} ({booking.tz})
        </span>
        <span className={styles.label}>Where</span>
        <span>{booking.location || "—"}</span>
        <span className={styles.label}>Attendee</span>
        <span>
          {booking.personName || "Guest"}
          {booking.personEmail ? ` · ${booking.personEmail}` : ""}
        </span>
        <span className={styles.label}>Status</span>
        <span>{booking.status}</span>
        <span className={styles.label}>Calendar</span>
        <span>{booking.googleEventId ? `Synced (${booking.googleEventId})` : "Not synced"}</span>
        {booking.personId ? (
          <>
            <span className={styles.label}>Person</span>
            <Link href={`/admin/people/${booking.personId}`} className={styles.mono}>
              View in People →
            </Link>
          </>
        ) : null}
      </div>

      {booking.answers.length > 0 ? (
        <div>
          <h4 className={styles.cardHead}>Intake answers</h4>
          <div className={styles.rowGrid}>
            {booking.answers.map((a, i) => (
              <div key={i} style={{ display: "contents" }}>
                <span className={styles.label}>{a.q}</span>
                <span>{a.a}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {booking.notes ? <p className={styles.faint}>{booking.notes}</p> : null}
      {notice ? <span className={styles.notice}>{notice}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}

      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={resend} loading={pending}>
          Resend confirmation
        </Button>
        {booking.status === "confirmed" ? (
          <Button variant="outline" size="sm" onClick={cancel} loading={pending}>
            Cancel booking
          </Button>
        ) : null}
      </div>
    </div>
  );
}
