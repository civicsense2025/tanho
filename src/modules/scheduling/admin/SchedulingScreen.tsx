"use client";

import { useRouter } from "next/navigation";
import type { BookingListItem, BookingSegment, EventTypeRow } from "../queries";
import type {
  AvailabilitySettings,
  ExtensionsSettings,
  TemplatesSettings,
} from "../validation";
import { BookingsTab } from "./BookingsTab";
import { EventTypesTab } from "./EventTypesTab";
import { AvailabilityTab } from "./AvailabilityTab";
import { ExtensionsTab } from "./ExtensionsTab";
import { TemplatesTab } from "./TemplatesTab";
import styles from "./scheduling.module.css";

export type SchedulingTab =
  | "bookings"
  | "event-types"
  | "availability"
  | "extensions"
  | "templates";

const TABS: { value: SchedulingTab; label: string }[] = [
  { value: "bookings", label: "Bookings" },
  { value: "event-types", label: "Event types" },
  { value: "availability", label: "Availability" },
  { value: "extensions", label: "Extensions" },
  { value: "templates", label: "Templates" },
];

export type SchedulingScreenProps = {
  tab: SchedulingTab;
  segment: BookingSegment;
  bookings: BookingListItem[];
  bookingCounts: Record<BookingSegment, number>;
  events: EventTypeRow[];
  availability: AvailabilitySettings;
  extensions: ExtensionsSettings;
  templates: TemplatesSettings;
  isOwner: boolean;
  googleConnected: boolean;
  googleAccountLabel: string;
  isGoogleOAuthConfigured: boolean;
};

/** The 5-tab scheduling admin. The active tab is URL-driven (?tab=…). */
export function SchedulingScreen(props: SchedulingScreenProps) {
  const router = useRouter();
  const { tab } = props;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Scheduling</h1>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`${styles.tab} ${t.value === tab ? styles.tabActive : ""}`}
            aria-pressed={t.value === tab}
            onClick={() => router.push(`/admin/scheduling?tab=${t.value}`)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bookings" ? (
        <BookingsTab
          bookings={props.bookings}
          segment={props.segment}
          counts={props.bookingCounts}
        />
      ) : null}
      {tab === "event-types" ? <EventTypesTab events={props.events} /> : null}
      {tab === "availability" ? (
        <AvailabilityTab
          settings={props.availability}
          isOwner={props.isOwner}
          googleConnected={props.googleConnected}
          googleAccountLabel={props.googleAccountLabel}
          isGoogleOAuthConfigured={props.isGoogleOAuthConfigured}
        />
      ) : null}
      {tab === "extensions" ? <ExtensionsTab extensions={props.extensions} /> : null}
      {tab === "templates" ? <TemplatesTab templates={props.templates} /> : null}
    </main>
  );
}
