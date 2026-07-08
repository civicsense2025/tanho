import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { connectionSummary, isConnected } from "@/modules/integrations";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import {
  bookingCounts,
  listBookings,
  listEventTypes,
  type BookingSegment,
} from "@/modules/scheduling/queries";
import {
  getAvailabilitySettings,
  getExtensionsSettings,
  getTemplatesSettings,
} from "@/modules/scheduling/settings";
import { listCalendars } from "@/modules/scheduling/gcal-calendars";
import {
  SchedulingScreen,
  type SchedulingTab,
} from "@/modules/scheduling/admin/SchedulingScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Scheduling" };

const TABS: SchedulingTab[] = [
  "bookings",
  "event-types",
  "availability",
  "extensions",
  "templates",
];
const SEGMENTS: BookingSegment[] = ["upcoming", "past", "cancelled"];

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={null}>
      <SchedulingPageInner searchParams={searchParams} />
    </Suspense>
  );
}

/** The 5-tab scheduling admin. Tab + booking segment are URL-driven. */
async function SchedulingPageInner({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = (TABS.includes(one(sp.tab) as SchedulingTab)
    ? (one(sp.tab) as SchedulingTab)
    : "bookings") satisfies SchedulingTab;
  const segment = (SEGMENTS.includes(one(sp.seg) as BookingSegment)
    ? (one(sp.seg) as BookingSegment)
    : "upcoming") satisfies BookingSegment;

  const [bookings, counts, events, availability, extensions, templates, googleConnected, googleSummary] =
    await Promise.all([
      listBookings(segment),
      bookingCounts(),
      listEventTypes(),
      getAvailabilitySettings(),
      getExtensionsSettings(),
      getTemplatesSettings(),
      isConnected("google-calendar"),
      connectionSummary("google-calendar"),
    ]);
  const googleCalendars = googleConnected ? await listCalendars() : [];

  return (
    <AdminPage>
      <SchedulingScreen
        tab={tab}
        segment={segment}
        bookings={bookings}
        bookingCounts={counts}
        events={events}
        availability={availability}
        extensions={extensions}
        templates={templates}
        isOwner={user.role === "owner"}
        googleConnected={googleConnected}
        googleAccountLabel={googleSummary?.accountLabel ?? ""}
        isGoogleOAuthConfigured={isGoogleOAuthConfigured()}
        googleCalendars={googleCalendars}
      />
    </AdminPage>
  );
}
