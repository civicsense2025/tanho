"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/core/Button";
import buttonStyles from "@/components/core/Button.module.css";
import { Input } from "@/components/forms/Input";
import { Toggle } from "@/components/admin/Seg";
import { disconnectIntegration } from "@/modules/integrations/actions";
import type { AvailabilitySettings } from "../validation";
import type { CalendarListItem } from "../gcal-calendars";
import { saveAvailability } from "../admin-actions";
import styles from "./scheduling.module.css";

const DAYS = [
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
  ["0", "Sun"],
] as const;

type Hours = AvailabilitySettings["hours"];

/** Availability tab — Google Calendar connect (real OAuth), weekly hours, and rules. */
export function AvailabilityTab({
  settings,
  isOwner,
  googleConnected,
  googleAccountLabel,
  isGoogleOAuthConfigured,
  googleCalendars,
}: {
  settings: AvailabilitySettings;
  isOwner: boolean;
  googleConnected: boolean;
  googleAccountLabel: string;
  isGoogleOAuthConfigured: boolean;
  googleCalendars: CalendarListItem[];
}) {
  const router = useRouter();
  const [hours, setHours] = useState<Hours>(settings.hours);
  const [rules, setRules] = useState({
    minNoticeHours: settings.minNoticeHours,
    dailyCap: settings.dailyCap,
    bufferBeforeMin: settings.bufferBeforeMin,
    bufferAfterMin: settings.bufferAfterMin,
    slotIncrementMin: settings.slotIncrementMin,
    timezone: settings.timezone,
    calendarId: settings.google.calendarId,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();

  const setDay = (key: string, value: { from: string; to: string } | null) =>
    setHours((cur) => ({ ...cur, [key]: value }));

  const save = async () => {
    setPending(true);
    setError(null);
    setNotice(null);
    const res = await saveAvailability({
      ...settings,
      ...rules,
      hours,
      google: { calendarId: rules.calendarId },
    });
    setPending(false);
    if (res.ok) {
      setNotice("Availability saved.");
      router.refresh();
    } else setError(res.error);
  };

  const disconnectGoogle = () =>
    startDisconnect(async () => {
      setError(null);
      const res = await disconnectIntegration("google-calendar");
      if (res.ok) router.refresh();
      else setError(res.error);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className={styles.card}>
        <h3 className={styles.cardHead}>Google Calendar</h3>
        <p className={styles.faint}>
          {googleConnected
            ? `Connected${googleAccountLabel ? ` · ${googleAccountLabel}` : ""}. Bookings sync and busy times block slots.`
            : "Not connected. Guests get an \"Add to Google Calendar\" link until you connect."}
        </p>
        {!isGoogleOAuthConfigured ? (
          <span className={styles.faint}>
            Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment to enable
            this.
          </span>
        ) : isOwner ? (
          <div className={styles.actions}>
            {googleConnected ? (
              <>
                {googleCalendars.length > 0 ? (
                  <div className={styles.rowGrid}>
                    <span className={styles.label}>Sync to calendar</span>
                    <select
                      className={styles.timeInput}
                      value={rules.calendarId}
                      onChange={(e) => setRules({ ...rules, calendarId: e.target.value })}
                    >
                      {googleCalendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                          {c.primary ? " (primary)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <Button variant="outline" size="sm" onClick={disconnectGoogle} loading={disconnecting}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Link
                href="/api/oauth/google/google-calendar"
                prefetch={false}
                className={[buttonStyles.btn, buttonStyles.sm, buttonStyles.outline].join(" ")}
              >
                Connect Google Calendar
              </Link>
            )}
          </div>
        ) : (
          <span className={styles.faint}>Owner access required to change this.</span>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHead}>Weekly hours</h3>
        <div className={styles.weekGrid}>
          {DAYS.map(([key, label]) => {
            const day = hours[key] ?? null;
            return (
              <div key={key} className={styles.dayRow}>
                <span className={styles.label}>{label}</span>
                <Toggle
                  value={!!day}
                  onChange={(on) => setDay(key, on ? { from: "10:00", to: "16:00" } : null)}
                />
                {day ? (
                  <span className={styles.chips}>
                    <Input
                      className={styles.timeInput}
                      type="time"
                      value={day.from}
                      onChange={(e) => setDay(key, { ...day, from: e.target.value })}
                    />
                    <Input
                      className={styles.timeInput}
                      type="time"
                      value={day.to}
                      onChange={(e) => setDay(key, { ...day, to: e.target.value })}
                    />
                  </span>
                ) : (
                  <span className={styles.faint}>Off</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardHead}>Rules</h3>
        <div className={styles.rowGrid}>
          <span className={styles.label}>Min notice (h)</span>
          <Input
            type="number"
            min={0}
            value={rules.minNoticeHours}
            onChange={(e) => setRules({ ...rules, minNoticeHours: Number(e.target.value) })}
          />
          <span className={styles.label}>Daily cap</span>
          <Input
            type="number"
            min={0}
            value={rules.dailyCap}
            onChange={(e) => setRules({ ...rules, dailyCap: Number(e.target.value) })}
          />
          <span className={styles.label}>Buffer before</span>
          <Input
            type="number"
            min={0}
            value={rules.bufferBeforeMin}
            onChange={(e) => setRules({ ...rules, bufferBeforeMin: Number(e.target.value) })}
          />
          <span className={styles.label}>Buffer after</span>
          <Input
            type="number"
            min={0}
            value={rules.bufferAfterMin}
            onChange={(e) => setRules({ ...rules, bufferAfterMin: Number(e.target.value) })}
          />
          <span className={styles.label}>Slot step</span>
          <Input
            type="number"
            min={5}
            value={rules.slotIncrementMin}
            onChange={(e) => setRules({ ...rules, slotIncrementMin: Number(e.target.value) })}
          />
          <span className={styles.label}>Timezone</span>
          <Input
            value={rules.timezone}
            onChange={(e) => setRules({ ...rules, timezone: e.target.value })}
            maxLength={80}
          />
        </div>
        <span className={styles.faint}>
          Buffers, caps and notice apply live to the public booking calendar.
        </span>
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
      {notice ? <span className={styles.notice}>{notice}</span> : null}
      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save availability
        </Button>
      </div>
    </div>
  );
}
