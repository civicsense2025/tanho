/**
 * Client-side track beacon. Fire-and-forget POST to /api/track. Uses
 * navigator.sendBeacon when available (survives navigation) and falls back to
 * fetch with keepalive. Never throws — analytics must not break the page.
 */
export type TrackProps = Record<string, string | number | boolean>;

export function sendTrack(name: string, path: string, props?: TrackProps): void {
  const payload = JSON.stringify({ name, path, props: props ?? {} });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/track", blob)) return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow — a failed beacon is never the reader's problem.
  }
}
