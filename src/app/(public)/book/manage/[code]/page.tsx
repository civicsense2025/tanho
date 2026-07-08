import { notFound } from "next/navigation";
import { getBookingByCode, getEventTypeById } from "@/modules/scheduling/queries";
import { ManagePanel } from "@/modules/scheduling/public/ManagePanel";

export const metadata = { title: "Manage booking" };

/**
 * Manage-by-code page. The unguessable code in the URL is the guest's auth to
 * cancel or reschedule — no login required.
 */
export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const booking = await getBookingByCode(code);
  if (!booking) notFound();
  const eventType = await getEventTypeById(booking.eventTypeId);

  return (
    <ManagePanel
      booking={{
        code: booking.code,
        eventSlug: eventType?.slug ?? "",
        eventName: eventType?.name ?? "Booking",
        date: booking.date,
        time: booking.time,
        tz: booking.tz,
        location: booking.location,
        status: booking.status,
        meetLink: booking.meetLink,
      }}
    />
  );
}
