import "server-only";
import { getAccessToken } from "@/adapters/google/oauth";

/**
 * Google Calendar list query — used by the AvailabilityTab calendar selector.
 * Separate from gcal-sync.ts to keep both files under the 300-line cap.
 * Best-effort: returns [] when not connected or on any failure.
 */

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export type CalendarListItem = {
  id: string;
  summary: string;
  primary: boolean;
};

/**
 * List the connected account's calendars for the admin calendar selector.
 * Returns [] when Calendar isn't connected or the call fails — the UI falls
 * back to "primary" in that case.
 */
export async function listCalendars(): Promise<CalendarListItem[]> {
  const token = await getAccessToken("google-calendar");
  if (!token) return [];

  try {
    const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("[gcal-calendars] list failed", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      items?: Array<{ id: string; summary: string; primary?: boolean }>;
    };
    return (data.items ?? []).map((c) => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary ?? false,
    }));
  } catch (err) {
    console.error("[gcal-calendars] list error", err);
    return [];
  }
}
