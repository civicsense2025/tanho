import { listActiveEventTypes } from "@/modules/scheduling/queries";
import { EventPicker } from "@/modules/scheduling/public/EventPicker";

export const metadata = { title: "Book a time" };

/** Public booking entry point — the active event-type picker. */
export default async function BookPage() {
  const events = await listActiveEventTypes();
  return <EventPicker events={events} />;
}
