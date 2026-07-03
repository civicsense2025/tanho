import { describe, expect, it } from "vitest";
import { slotsFor, type SlotBooking } from "./slots";
import { availabilitySettingsSchema, type AvailabilitySettings } from "./validation";

// 2026-07-06 is a Monday (UTC weekday 1); 2026-07-05 is a Sunday (weekday 0).
const MON = "2026-07-06";
const SUN = "2026-07-05";

/** Base settings: Mon–Fri 10:00–16:00, no buffers, generous cap, UTC. */
function makeSettings(over: Partial<AvailabilitySettings> = {}): AvailabilitySettings {
  return availabilitySettingsSchema.parse({
    timezone: "UTC",
    minNoticeHours: 0,
    dailyCap: 10,
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
    ...over,
  });
}

const evt = (durationMin: number) => ({ durationMin });
const booking = (b: Partial<SlotBooking>): SlotBooking => ({
  date: MON,
  time: "10:00",
  durationMin: 30,
  status: "confirmed",
  ...b,
});

// A far-future "now" so min-notice never trims (unless a test opts in).
const FAR_PAST_NOW = new Date("2020-01-01T00:00:00Z");

describe("slotsFor", () => {
  it("returns evenly-spaced slots across the working window", () => {
    const slots = slotsFor(MON, evt(30), makeSettings(), [], FAR_PAST_NOW);
    // 10:00..15:30 at 30-min increments; last 30-min meeting ends by 16:00.
    expect(slots).toEqual([
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    ]);
  });

  it("gives no slots on a day that is off", () => {
    // Sunday (weekday 0) has no hours entry.
    expect(slotsFor(SUN, evt(30), makeSettings(), [], FAR_PAST_NOW)).toEqual([]);
  });

  it("respects the slot increment spacing", () => {
    const slots = slotsFor(MON, evt(30), makeSettings({ slotIncrementMin: 60 }), [], FAR_PAST_NOW);
    expect(slots).toEqual(["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]);
  });

  it("does not offer a start whose meeting would run past the window", () => {
    // 90-min meeting in a 10:00–16:00 window: last valid start is 14:30.
    const slots = slotsFor(MON, evt(90), makeSettings(), [], FAR_PAST_NOW);
    expect(slots[slots.length - 1]).toBe("14:30");
    expect(slots).not.toContain("15:00");
  });

  it("filters out times inside the minimum-notice window", () => {
    // now = Monday 11:10 UTC, 2h notice → cutoff 13:10 rounds up to 13:30.
    const now = new Date("2026-07-06T11:10:00Z");
    const slots = slotsFor(MON, evt(30), makeSettings({ minNoticeHours: 2 }), [], now);
    expect(slots).toEqual(["13:30", "14:00", "14:30", "15:00", "15:30"]);
    expect(slots).not.toContain("13:00");
  });

  it("returns nothing once the daily cap is reached", () => {
    const settings = makeSettings({ dailyCap: 2 });
    const existing = [
      booking({ time: "10:00" }),
      booking({ time: "12:00" }),
    ];
    expect(slotsFor(MON, evt(30), settings, existing, FAR_PAST_NOW)).toEqual([]);
  });

  it("still offers slots below the cap", () => {
    const settings = makeSettings({ dailyCap: 5 });
    const existing = [booking({ time: "10:00" })];
    const slots = slotsFor(MON, evt(30), settings, existing, FAR_PAST_NOW);
    // 10:00 is taken; everything else stays.
    expect(slots).not.toContain("10:00");
    expect(slots).toContain("11:00");
  });

  it("blocks a confirmed booking's exact window (no double-booking)", () => {
    const existing = [booking({ time: "12:00", durationMin: 30 })];
    const slots = slotsFor(MON, evt(30), makeSettings(), existing, FAR_PAST_NOW);
    expect(slots).not.toContain("12:00");
    // Adjacent slots are fine with zero buffers.
    expect(slots).toContain("11:30");
    expect(slots).toContain("12:30");
  });

  it("holds a slot for a payment-pending booking (no double-charge race)", () => {
    // A paid booking awaiting Stripe payment must still occupy its slot so a
    // second guest can't start paying for the same time.
    const existing = [booking({ time: "12:00", durationMin: 30, status: "pending" })];
    const slots = slotsFor(MON, evt(30), makeSettings(), existing, FAR_PAST_NOW);
    expect(slots).not.toContain("12:00");
  });

  it("frees a slot once a booking is cancelled", () => {
    const existing = [booking({ time: "12:00", durationMin: 30, status: "cancelled" })];
    const slots = slotsFor(MON, evt(30), makeSettings(), existing, FAR_PAST_NOW);
    expect(slots).toContain("12:00");
  });

  it("blocks a booking's window PLUS buffers on both sides", () => {
    // 15-min buffers around a 12:00–12:30 booking occupy 11:45–12:45.
    const settings = makeSettings({ bufferBeforeMin: 15, bufferAfterMin: 15 });
    const existing = [booking({ time: "12:00", durationMin: 30 })];
    const slots = slotsFor(MON, evt(30), settings, existing, FAR_PAST_NOW);
    // A 30-min meeting at 11:30 occupies 11:15–12:00 (with buffers), which
    // overlaps the booking's 11:45 buffered start → blocked.
    expect(slots).not.toContain("11:30");
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:30");
    // 11:00 (occupies 10:45–11:45) clears the 11:45 edge → allowed.
    expect(slots).toContain("11:00");
  });

  it("ignores cancelled bookings when computing collisions", () => {
    const existing = [booking({ time: "12:00", status: "cancelled" })];
    const slots = slotsFor(MON, evt(30), makeSettings(), existing, FAR_PAST_NOW);
    expect(slots).toContain("12:00");
  });

  it("accounts for each existing booking's own duration", () => {
    // A 2-hour booking at 11:00 occupies 11:00–13:00.
    const existing = [booking({ time: "11:00", durationMin: 120 })];
    const slots = slotsFor(MON, evt(30), makeSettings(), existing, FAR_PAST_NOW);
    expect(slots).not.toContain("11:00");
    expect(slots).not.toContain("11:30");
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:30");
    expect(slots).toContain("10:30"); // ends 11:00, touches but no overlap
    expect(slots).toContain("13:00"); // starts as the booking ends
  });

  it("returns nothing for a past date", () => {
    const now = new Date("2026-07-10T09:00:00Z");
    expect(slotsFor(MON, evt(30), makeSettings(), [], now)).toEqual([]);
  });
});
