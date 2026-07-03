import { settings } from "../../src/modules/settings/schema";
import { eventTypes } from "../../src/modules/scheduling/schema";
import {
  availabilitySettingsSchema,
  extensionsSchema,
  templatesSchema,
} from "../../src/modules/scheduling/validation";
import { log, type SeedDb } from "../lib";

/**
 * Neutral scheduling seed. Availability = Mon–Fri 10:00–16:00, 12h notice,
 * cap 4, no buffers, UTC, Google disconnected. Two extensions on by default
 * (email confirm + reminder). Neutral {{placeholder}} template copy. ONE
 * example event type "Intro call" (30 min, free, zoom). NO sample bookings and
 * NO brand. Idempotent: skip if the row/event already exists.
 */
export async function seedScheduling(db: SeedDb) {
  const availability = availabilitySettingsSchema.parse({
    timezone: "UTC",
    minNoticeHours: 12,
    dailyCap: 4,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    slotIncrementMin: 30,
    hours: {
      "1": { from: "10:00", to: "16:00" },
      "2": { from: "10:00", to: "16:00" },
      "3": { from: "10:00", to: "16:00" },
      "4": { from: "10:00", to: "16:00" },
      "5": { from: "10:00", to: "16:00" },
    },
    google: { connected: false, account: "", calendar: "" },
  });

  const extensions = extensionsSchema.parse({
    items: [
      { id: "email-confirm", label: "Confirmation email", on: true, settings: {} },
      { id: "email-reminder", label: "Reminder email", on: true, settings: { hoursBefore: 24 } },
      { id: "sms-reminder", label: "SMS reminder", on: false, settings: {} },
      { id: "gcal-sync", label: "Google Calendar sync", on: false, settings: {} },
      { id: "buffers", label: "Buffers", on: false, settings: {} },
      { id: "payments", label: "Paid bookings", on: false, settings: {} },
      { id: "cancel-policy", label: "Cancellation policy", on: false, settings: { cutoffHours: 24 } },
    ],
  });

  const templates = templatesSchema.parse({
    emailConfirmSubject: "Your {{event}} is confirmed",
    emailConfirm:
      "Hi {{first}},\n\nYour {{event}} is confirmed for {{when}}.\nLocation: {{location}}\n\nManage your booking any time: {{manage_url}}",
    emailReminderSubject: "Reminder: {{event}} {{when}}",
    emailReminder:
      "Hi {{first}},\n\nThis is a reminder that your {{event}} is {{when}}.\nLocation: {{location}}\n\nManage it here: {{manage_url}}",
    sms: "Reminder: {{event}} {{when}}. Manage: {{manage_url}}",
    page: "Thanks {{first}} — your {{event}} is booked for {{when}}.",
  });

  await db
    .insert(settings)
    .values({ namespace: "scheduling", data: availability })
    .onConflictDoNothing();
  await db
    .insert(settings)
    .values({ namespace: "sched_extensions", data: extensions })
    .onConflictDoNothing();
  await db
    .insert(settings)
    .values({ namespace: "sched_templates", data: templates })
    .onConflictDoNothing();

  await db
    .insert(eventTypes)
    .values({
      slug: "intro-call",
      name: "Intro call",
      durationMin: 30,
      priceCents: 0,
      color: "accent",
      description: "A quick introductory call.",
      locations: ["zoom"],
      formId: null,
      active: true,
    })
    .onConflictDoNothing();

  log("scheduling settings + one example event type seeded (skip if present)");
}
