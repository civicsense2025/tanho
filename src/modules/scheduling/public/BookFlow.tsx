"use client";

import { useEffect, useState } from "react";
import { availableSlots, createBooking } from "../booking-actions";
import { addToGoogleCalendarUrl } from "../gcal";
import { IntakePanel } from "./IntakePanel";
import { addDays, humanDate, todayISO } from "./dates";
import styles from "./book.module.css";

export type BookFlowEvent = {
  slug: string;
  name: string;
  durationMin: number;
  priceCents: number;
  locations: string[];
};

type Step = "pick" | "intake" | "done";

/**
 * The public booking island: date navigation → slot pick → intake → confirm.
 * Slots load from the server action (authoritative); createBooking re-checks
 * server-side, so a stale slot is rejected rather than double-booked.
 */
export function BookFlow({ event }: { event: BookFlowEvent }) {
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [location, setLocation] = useState(event.locations[0] ?? "zoom");
  const [step, setStep] = useState<Step>("pick");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  // Load slots whenever the date changes (and on mount). A cancel flag drops a
  // stale response if the user pages forward before the previous fetch lands.
  // All setState happens after the await, so the effect never sets state
  // synchronously (which would cascade renders).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await availableSlots({ eventTypeSlug: event.slug, date });
      if (cancelled) return;
      setSlots(list);
      setTime(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, event.slug]);

  const move = (delta: number) => {
    const next = addDays(date, delta);
    if (next < todayISO()) return;
    setSlots(null); // event handler — clearing here is fine
    setDate(next);
  };

  const submit = async (form: { name: string; email: string; phone: string }) => {
    if (!time) return;
    setPending(true);
    setError(null);
    const res = await createBooking({
      eventTypeSlug: event.slug,
      date,
      time,
      location,
      person: { ...form, answers: [] },
    });
    setPending(false);
    if (res.ok) {
      // Paid booking: send the guest to Stripe Checkout. The webhook confirms
      // on payment; the success URL returns them to the manage page.
      if ("checkoutUrl" in res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setCode(res.code);
      setStep("done");
    } else {
      setError(res.error);
      setStep("pick");
      // Refresh the day's slots (the picked one may now be taken).
      const list = await availableSlots({ eventTypeSlug: event.slug, date });
      setSlots(list);
      setTime(null);
    }
  };

  if (step === "done" && code) {
    const gcal = addToGoogleCalendarUrl({
      eventName: event.name,
      date,
      time: time ?? "",
      durationMin: event.durationMin,
      location,
    });
    return (
      <div className={styles.panel}>
        <span className={styles.eyebrow}>Confirmed</span>
        <p className={styles.lede}>
          Your {event.name} is booked for {humanDate(date)} at {time}.
        </p>
        <div className={styles.codeBox}>{code}</div>
        <p className={styles.cardMeta}>Keep this code to manage your booking.</p>
        <div className={styles.linkRow}>
          <a className={styles.link} href={gcal} target="_blank" rel="noreferrer">
            Add to Google Calendar
          </a>
          <a className={styles.link} href={`/book/manage/${code}`}>
            Manage booking
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.split}>
      <div className={styles.panel}>
        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => move(-1)}
            disabled={date <= todayISO()}
            aria-label="Previous day"
          >
            {"<"}
          </button>
          <span className={styles.dateLabel}>{humanDate(date)}</span>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => move(1)}
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
                className={`${styles.slot} ${time === s ? styles.slotActive : ""}`}
                onClick={() => {
                  setTime(s);
                  setStep("intake");
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>

      <IntakePanel
        event={event}
        active={step === "intake" && !!time}
        time={time}
        date={date}
        location={location}
        onLocation={setLocation}
        pending={pending}
        onSubmit={submit}
      />
    </div>
  );
}
