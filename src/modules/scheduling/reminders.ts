import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { email as emailAdapter } from "@/adapters/email";
import { linkTo } from "@/modules/people/links";
import { people } from "@/modules/people/schema";
import { bookings } from "./schema";
import { getBookingByCode, getEventTypeById } from "./queries";
import { getTemplatesSettings } from "./settings";
import { renderTemplate, templateVars } from "./templates";

/**
 * Reminder + confirmation delivery through the console EmailAdapter. There is
 * NO cron here — `sendReminder(code)` is exposed for the admin "resend" action
 * and a future scheduler. Both confirmation and reminder share the template
 * rendering so copy stays consistent.
 */

type Kind = "confirm" | "reminder";

/** Send a confirmation or reminder email for a booking, keyed by manage code. */
export async function sendBookingEmail(code: string, kind: Kind): Promise<boolean> {
  const booking = await getBookingByCode(code);
  if (!booking) return false;
  const eventType = await getEventTypeById(booking.eventTypeId);
  const person = booking.personId
    ? await db.query.people.findFirst({ where: eq(people.id, booking.personId) })
    : null;
  if (!person) return false;

  const tpl = await getTemplatesSettings();
  const vars = templateVars({
    name: person.name || person.email,
    email: person.email,
    eventName: eventType?.name ?? "your booking",
    date: booking.date,
    time: booking.time,
    tz: booking.tz,
    location: booking.location,
    manageUrl: linkTo(`/book/manage/${booking.code}`),
  });

  const subject =
    kind === "confirm" ? tpl.emailConfirmSubject : tpl.emailReminderSubject;
  const body = kind === "confirm" ? tpl.emailConfirm : tpl.emailReminder;
  await emailAdapter.send({
    to: person.email,
    subject: renderTemplate(subject, vars),
    text: renderTemplate(body || defaultBody(kind), vars),
  });

  if (kind === "reminder") {
    await db
      .update(bookings)
      .set({ remindersSent: { ...booking.remindersSent, email: true } })
      .where(eq(bookings.id, booking.id));
  }
  return true;
}

/** Convenience for the admin "resend confirmation" action. */
export async function sendReminder(code: string): Promise<boolean> {
  return sendBookingEmail(code, "reminder");
}

/** Fallback copy when an author left a template blank. */
function defaultBody(kind: Kind): string {
  return kind === "confirm"
    ? "Hi {{first}}, your {{event}} is confirmed for {{when}} at {{location}}. Manage it any time: {{manage_url}}"
    : "Hi {{first}}, a reminder that your {{event}} is {{when}} at {{location}}. Manage it: {{manage_url}}";
}
