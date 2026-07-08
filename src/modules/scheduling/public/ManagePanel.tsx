"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { cancelBooking, rescheduleBooking, availableSlots } from "../booking-actions";
import { addDays, humanDate, todayISO } from "./dates";
import styles from "./book.module.css";

export type ManageBooking = {
  code: string;
  eventSlug: string;
  eventName: string;
  date: string;
  time: string;
  tz: string;
  location: string;
  status: "pending" | "confirmed" | "cancelled";
  meetLink: string | null;
};

/**
 * Guest-facing manage panel. The unguessable code in the URL is the auth —
 * there is no login. Cancel or reschedule; the server re-validates the new slot.
 */
export function ManagePanel({ booking }: { booking: ManageBooking }) {
  const [status, setStatus] = useState(booking.status);
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(booking.date);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const openReschedule = async () => {
    setRescheduling(true);
    setSlots(null);
    setSlots(await availableSlots({ eventTypeSlug: booking.eventSlug, date }));
  };

  const move = async (delta: number) => {
    const next = addDays(date, delta);
    if (next < todayISO()) return;
    setDate(next);
    setSlots(null);
    setSlots(await availableSlots({ eventTypeSlug: booking.eventSlug, date: next }));
  };

  const pick = async (time: string) => {
    setPending(true);
    setError(null);
    const res = await rescheduleBooking(booking.code, date, time);
    setPending(false);
    if (res.ok) {
      setNotice(`Moved to ${humanDate(date)} at ${time}.`);
      setRescheduling(false);
    } else {
      setError(res.error);
    }
  };

  const cancel = async () => {
    setPending(true);
    const res = await cancelBooking(booking.code);
    setPending(false);
    if (res.ok) setStatus("cancelled");
    else setError(res.error);
  };

  return (
    <div className={styles.page}>
      <span className={styles.eyebrow}>Manage booking</span>
      <h1 className={styles.title}>{booking.eventName}</h1>
      <p className={styles.lede}>
        {status === "cancelled"
          ? "This booking is cancelled."
          : status === "pending"
            ? `Payment pending — this slot is held until you complete checkout. ${humanDate(booking.date)} at ${booking.time} (${booking.tz}).`
            : `${humanDate(booking.date)} at ${booking.time} (${booking.tz}) · ${booking.location}`}
      </p>
      {notice ? <p className={styles.cardMeta}>{notice}</p> : null}
      {error ? <span className={styles.error}>{error}</span> : null}

      {status === "confirmed" && booking.meetLink ? (
        <div className={styles.linkRow}>
          <a className={styles.link} href={booking.meetLink} target="_blank" rel="noreferrer">
            Join Google Meet
          </a>
        </div>
      ) : null}

      {status === "confirmed" && !rescheduling ? (
        <div className={styles.linkRow}>
          <Button variant="outline" size="sm" onClick={openReschedule}>
            Reschedule
          </Button>
          <Button variant="outline" size="sm" onClick={cancel} loading={pending}>
            Cancel booking
          </Button>
        </div>
      ) : null}

      {status === "confirmed" && rescheduling ? (
        <div className={styles.panel}>
          <div className={styles.navRow}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => void move(-1)}
              disabled={date <= todayISO()}
              aria-label="Previous day"
            >
              {"<"}
            </button>
            <span className={styles.dateLabel}>{humanDate(date)}</span>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => void move(1)}
              aria-label="Next day"
            >
              {">"}
            </button>
          </div>
          {slots === null ? (
            <span className={styles.empty}>Loading times…</span>
          ) : slots.length === 0 ? (
            <span className={styles.empty}>No times available this day.</span>
          ) : (
            <div className={styles.slots}>
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.slot}
                  onClick={() => void pick(s)}
                  disabled={pending}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
