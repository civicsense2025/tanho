"use client";

import { useReportWebVitals } from "next/web-vitals";

/** Metrics we persist (must match seoWebVitals / WEB_VITALS_METRICS). */
const TRACKED = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const ENDPOINT = "/api/seo/vitals";

/**
 * Stable module-level reporter (the hook warns against changing the callback
 * reference, which would double-report). Sends one beacon per tracked metric
 * via sendBeacon (falls back to a keepalive fetch), best-effort — a failed
 * beacon must never affect the page.
 */
function report(metric: { name: string; value: number; rating?: string }): void {
  if (!TRACKED.has(metric.name)) return;
  const body = JSON.stringify({
    metric: metric.name,
    value: metric.value,
    rating: metric.rating ?? "",
    path: typeof location !== "undefined" ? location.pathname : "",
  });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, body);
    } else {
      void fetch(ENDPOINT, { method: "POST", body, keepalive: true });
    }
  } catch {
    // best-effort; ignore
  }
}

/**
 * Reports Core Web Vitals field data (RUM) to the SEO audit. Mounted once in
 * the public layout; renders nothing. Client-only so the `next/web-vitals`
 * boundary stays confined here.
 */
export function WebVitalsBeacon() {
  useReportWebVitals(report);
  return null;
}
