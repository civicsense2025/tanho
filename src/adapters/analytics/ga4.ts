import "server-only";
import type {
  AnalyticsOverviewData,
  AnalyticsPageStat,
  AnalyticsQueryStat,
  AnalyticsReadAdapter,
} from "../types";
import { isConnected } from "@/modules/integrations";
import { getAnalyticsSettings } from "@/modules/analytics/settings";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import { getAccessToken } from "@/adapters/google/oauth";
import { internalAnalytics } from "./internal";

/**
 * Real GA4 (Analytics Data API) + Search Console read adapter. BYO: only
 * "configured" when the deployment has its own Google OAuth app AND has
 * connected the relevant surface. Any live-call failure falls back to the
 * internal (first-party) adapter and logs — a Google API hiccup must never
 * break the admin dashboard.
 */

const GA4_ENDPOINT = "https://analyticsdata.googleapis.com/v1beta";
const GSC_ENDPOINT = "https://searchconsole.googleapis.com/webmasters/v3";

async function isReady(): Promise<boolean> {
  if (!isGoogleOAuthConfigured()) return false;
  const [ga, gsc] = await Promise.all([
    isConnected("google-analytics"),
    isConnected("google-search-console"),
  ]);
  return ga || gsc;
}

type Ga4Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Ga4Report = { rows?: Ga4Row[] };

async function runGa4Report(body: Record<string, unknown>): Promise<Ga4Report | null> {
  const settings = await getAnalyticsSettings();
  if (!settings.ga4PropertyId) return null;
  const token = await getAccessToken("google-analytics");
  if (!token) return null;

  const res = await fetch(`${GA4_ENDPOINT}/${settings.ga4PropertyId}:runReport`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GA4 runReport failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as Ga4Report;
}

async function ga4Overview(days: number): Promise<AnalyticsOverviewData> {
  // Two dateRanges in one request — GA4 tags each row with a "dateRange"
  // dimension ("date_range_0" = current, "date_range_1" = prior) so both
  // windows come back from a single report call.
  const report = await runGa4Report({
    dateRanges: [
      { startDate: `${days}daysAgo`, endDate: "today" },
      { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` },
    ],
    dimensions: [{ name: "dateRange" }],
    metrics: [
      { name: "totalUsers" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
  });
  const rowFor = (rangeIndex: number) =>
    report?.rows?.find((r) => r.dimensionValues?.[0]?.value === `date_range_${rangeIndex}`);
  const metric = (row: Ga4Row | undefined, i: number) => Number(row?.metricValues?.[i]?.value ?? 0);
  const current = rowFor(0);
  const prior = rowFor(1);

  const pagesReport = await runGa4Report({
    dateRanges: [
      { startDate: `${days}daysAgo`, endDate: "today" },
      { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` },
    ],
    dimensions: [{ name: "dateRange" }, { name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
  });
  const pageCount = (rangeIndex: number) =>
    (pagesReport?.rows ?? []).filter((r) => r.dimensionValues?.[0]?.value === `date_range_${rangeIndex}`).length;

  return {
    visitors: metric(current, 0),
    pageviews: metric(current, 1),
    events: metric(current, 2),
    pages: pageCount(0),
    windowDays: days,
    prior: {
      visitors: metric(prior, 0),
      pageviews: metric(prior, 1),
      events: metric(prior, 2),
      pages: pageCount(1),
    },
  };
}

async function ga4TopPages(days: number, limit: number): Promise<AnalyticsPageStat[]> {
  const report = await runGa4Report({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });
  return (report?.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value || "/",
    views: Number(row.metricValues?.[0]?.value ?? 0),
    uniques: Number(row.metricValues?.[1]?.value ?? 0),
  }));
}

type GscRow = { keys?: string[]; clicks?: number; ctr?: number };

async function gscTopQueries(days: number, limit: number): Promise<AnalyticsQueryStat[]> {
  const settings = await getAnalyticsSettings();
  if (!settings.gscSiteUrl) return [];
  const token = await getAccessToken("google-search-console");
  if (!token) return [];

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  const res = await fetch(
    `${GSC_ENDPOINT}/sites/${encodeURIComponent(settings.gscSiteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate: toISO(start),
        endDate: toISO(end),
        dimensions: ["query"],
        rowLimit: limit,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Search Console query failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { rows?: GscRow[] };
  return (data.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? "",
    clicks: Number(row.clicks ?? 0),
    ctr: Number(row.ctr ?? 0),
  }));
}

export const ga4Analytics: AnalyticsReadAdapter = {
  isConfigured: isReady,

  async overview(days = 30) {
    try {
      if (await isConnected("google-analytics")) return await ga4Overview(days);
    } catch (err) {
      console.error("[ga4] overview failed, falling back to internal", err);
    }
    return internalAnalytics.overview(days);
  },

  async topPages(days = 30, limit = 10) {
    try {
      if (await isConnected("google-analytics")) return await ga4TopPages(days, limit);
    } catch (err) {
      console.error("[ga4] topPages failed, falling back to internal", err);
    }
    return internalAnalytics.topPages(days, limit);
  },

  async topQueries(days = 30, limit = 10) {
    try {
      if (await isConnected("google-search-console")) return await gscTopQueries(days, limit);
    } catch (err) {
      console.error("[gsc] topQueries failed, falling back to internal", err);
    }
    return internalAnalytics.topQueries(days, limit);
  },
};
