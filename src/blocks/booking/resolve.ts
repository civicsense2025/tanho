import { getEventTypeBySlug } from "@/modules/scheduling/queries";
import type { BookingContent } from "./fields";

export type BookingResolved = {
  /** Resolved event, or null when the slug is blank/unknown → link to picker. */
  event: { name: string; slug: string; durationMin: number; priceCents: number } | null;
  href: string;
};

/**
 * Server-only: resolve the featured event type by slug. A blank or unknown
 * slug degrades to a link to the full picker (/book) rather than failing.
 */
export async function resolveBooking(content: BookingContent): Promise<BookingResolved> {
  if (!content.eventTypeSlug) return { event: null, href: "/book" };
  const row = await getEventTypeBySlug(content.eventTypeSlug);
  if (!row || !row.active) return { event: null, href: "/book" };
  return {
    event: {
      name: row.name,
      slug: row.slug,
      durationMin: row.durationMin,
      priceCents: row.priceCents,
    },
    href: `/book/${row.slug}`,
  };
}
