"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { saveSettings } from "@/modules/settings/actions";
import { eventTypes } from "./schema";
import { getBookingByCode } from "./queries";
import { sendBookingEmail } from "./reminders";
import { cancelBooking } from "./booking-actions";
import {
  availabilitySettingsSchema,
  eventTypeSchema,
  extensionsSchema,
  templatesSchema,
} from "./validation";
import { SCHED_NS, SCHED_EXT_NS, SCHED_TPL_NS } from "./settings";
import { listCalendars, type CalendarListItem } from "./gcal-calendars";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Create or update an event type (owner/editor). */
export async function saveEventType(
  id: string | null,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = eventTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid event type." };
  }
  const data = parsed.data;

  // Slug uniqueness (excluding self on edit).
  const clash = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.slug, data.slug),
  });
  if (clash && clash.id !== id) {
    return { ok: false, error: "That slug is already in use." };
  }

  let savedId = id ?? undefined;
  if (id) {
    await db.update(eventTypes).set(data).where(eq(eventTypes.id, id));
  } else {
    const [row] = await db.insert(eventTypes).values(data).returning({ id: eventTypes.id });
    savedId = row!.id;
  }
  updateTag("pages"); // booking blocks resolve from event types
  await writeAudit({
    userId: user.id,
    action: id ? "scheduling.eventType.update" : "scheduling.eventType.create",
    ownerType: "event_type",
    ownerId: savedId,
  });
  return { ok: true, id: savedId };
}

/** Delete an event type (owner/editor). Existing bookings keep their row. */
export async function deleteEventType(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!id) return { ok: false, error: "Missing event type." };
  await db.delete(eventTypes).where(eq(eventTypes.id, id));
  updateTag("pages");
  await writeAudit({
    userId: user.id,
    action: "scheduling.eventType.delete",
    ownerType: "event_type",
    ownerId: id,
  });
  return { ok: true };
}

/** Toggle an event type active/off inline. */
export async function setEventTypeActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireUser();
  const value = z.boolean().parse(active);
  await db.update(eventTypes).set({ active: value }).where(eq(eventTypes.id, id));
  updateTag("pages");
  return { ok: true };
}

/** Save availability settings (weekly hours + rules). */
export async function saveAvailability(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = availabilitySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid availability." };
  }
  const res = await saveSettings(SCHED_NS, parsed.data);
  return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Save failed." };
}

/** Save the extensions toggle set. */
export async function saveExtensions(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = extensionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid extensions." };
  }
  const res = await saveSettings(SCHED_EXT_NS, parsed.data);
  return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Save failed." };
}

/** Save the email/SMS/page templates. */
export async function saveTemplates(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = templatesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid templates." };
  }
  const res = await saveSettings(SCHED_TPL_NS, parsed.data);
  return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Save failed." };
}

/** Cancel a booking from the admin (owner/editor). */
export async function adminCancelBooking(code: string): Promise<ActionResult> {
  const user = await requireUser();
  const res = await cancelBooking(code);
  if (!res.ok) return res;
  await writeAudit({
    userId: user.id,
    action: "scheduling.booking.cancel",
    ownerType: "booking",
    ownerId: code,
  });
  return { ok: true };
}

/** Resend the confirmation email for a booking (owner/editor). */
export async function resendConfirmation(code: string): Promise<ActionResult> {
  const user = await requireUser();
  const booking = await getBookingByCode(code);
  if (!booking) return { ok: false, error: "Booking not found." };
  const sent = await sendBookingEmail(code, "confirm");
  if (!sent) return { ok: false, error: "No contact on file to email." };
  await writeAudit({
    userId: user.id,
    action: "scheduling.booking.resend",
    ownerType: "booking",
    ownerId: code,
  });
  return { ok: true };
}

/**
 * List the connected Google account's calendars for the AvailabilityTab
 * calendar selector. Returns [] when Calendar isn't connected — the UI falls
 * back to "primary" in that case. Owner-only (calls the Calendar API with the
 * owner's stored credentials).
 */
export async function listGoogleCalendars(): Promise<CalendarListItem[]> {
  await requireUser("owner");
  return listCalendars();
}
