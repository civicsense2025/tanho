import { parseCsv } from "./csv";

/**
 * Canonical subscriber importer for major newsletter platforms. Maps each platform's export CSV
 * onto one normalized shape, based on the documented column headers and status vocabularies of
 * Substack, Mailchimp, Ghost, Buttondown, ConvertKit/Kit, and beehiiv.
 *
 * Design principles (from platform docs):
 *  - `email` is the only universal key; header casing varies (Email / Email Address / email).
 *  - Status vocabularies never align — each platform is normalized to our own enum.
 *  - Never auto-mark an imported address `active` without a consent signal in the file; unknowns
 *    default to `pending` so a site owner honors double-opt-in obligations.
 */

export type ImportPlatform = "substack" | "mailchimp" | "ghost" | "buttondown" | "kit" | "beehiiv" | "generic";

/** Our normalized subscriber status. */
export type CanonicalStatus = "active" | "unsubscribed" | "pending";

export interface CanonicalSubscriber {
  email: string;
  status: CanonicalStatus;
  name: string | null;
  source: string;
}

export interface ImportParseResult {
  platform: ImportPlatform;
  rows: CanonicalSubscriber[];
  /** Rows skipped for a missing/invalid email, with the raw value for the admin to review. */
  skipped: { raw: string; reason: string }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lower-cases + trims a header for matching. */
function norm(h: string): string {
  return h.trim().toLowerCase();
}

/** Detects the source platform from the header row's signature columns. */
function detectPlatform(headers: string[]): ImportPlatform {
  const set = new Set(headers.map(norm));
  if (set.has("subscriber_type") && set.has("subscription_date")) return "buttondown";
  if (set.has("subscribed_to_emails") || (set.has("email") && set.has("stripe_customer_id"))) return "ghost";
  if (set.has("email address") || set.has("optin_time") || set.has("member_rating")) return "mailchimp";
  // Substack: an `email` column with subscription type/status, no Ghost/Buttondown markers.
  if (set.has("email") && (set.has("subscription status") || set.has("subscription type"))) return "substack";
  if (set.has("email address") === false && set.has("email") && (set.has("state") || set.has("tags"))) return "kit";
  if (set.has("email")) return "generic";
  return "generic";
}

/** Finds the index of the first header matching any candidate (case-insensitive). */
function col(headers: string[], candidates: string[]): number {
  const normalized = headers.map(norm);
  for (const cand of candidates) {
    const idx = normalized.indexOf(norm(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Per-platform status normalization, per the documented vocabularies. Unknown → pending. */
function normalizeStatus(platform: ImportPlatform, raw: string): CanonicalStatus {
  const v = raw.trim().toLowerCase();
  switch (platform) {
    case "substack":
      if (v === "active") return "active";
      if (v === "cancelled" || v === "canceled" || v === "paused") return "unsubscribed";
      return "pending";
    case "beehiiv":
      if (v === "active") return "active";
      if (v === "inactive" || v === "invalid") return "unsubscribed";
      return "pending"; // pending/validating/needs_attention/paused
    case "mailchimp":
      if (v === "subscribed") return "active";
      if (v === "unsubscribed" || v === "cleaned") return "unsubscribed";
      return "pending";
    case "kit":
      if (v === "active" || v === "confirmed") return "active";
      if (v === "cancelled" || v === "canceled" || v === "unsubscribed" || v === "bounced" || v === "complained") return "unsubscribed";
      return "pending"; // inactive/unconfirmed/cold
    case "ghost":
      // subscribed_to_emails is a boolean.
      if (v === "true") return "active";
      if (v === "false") return "unsubscribed";
      return "pending";
    case "buttondown":
      if (v === "regular" || v === "premium" || v === "gifted") return "active";
      if (v === "unsubscribed" || v === "removed" || v === "undeliverable" || v === "complained") return "unsubscribed";
      return "pending"; // unactivated
    default:
      if (v === "active" || v === "subscribed" || v === "true") return "active";
      if (v === "unsubscribed" || v === "cancelled" || v === "canceled" || v === "false") return "unsubscribed";
      return "pending";
  }
}

/** Column map per platform: which header names carry email / status / name parts. */
function columnsFor(platform: ImportPlatform, headers: string[]) {
  const emailIdx = col(headers, ["email", "email address"]);
  let statusIdx = -1;
  let nameIdx = -1;
  let firstIdx = -1;
  let lastIdx = -1;

  switch (platform) {
    case "substack":
      statusIdx = col(headers, ["subscription status"]);
      break;
    case "mailchimp":
      firstIdx = col(headers, ["first name"]);
      lastIdx = col(headers, ["last name"]);
      // Mailchimp CSV has no status column; treat presence in export as subscribed unless a
      // TAGS/opt column says otherwise — default handled by caller (no status → pending-safe).
      break;
    case "ghost":
      nameIdx = col(headers, ["name"]);
      statusIdx = col(headers, ["subscribed_to_emails"]);
      break;
    case "buttondown":
      statusIdx = col(headers, ["subscriber_type"]);
      break;
    case "kit":
      firstIdx = col(headers, ["first name"]);
      statusIdx = col(headers, ["status", "state"]);
      break;
    case "beehiiv":
      statusIdx = col(headers, ["status"]);
      break;
    default:
      statusIdx = col(headers, ["status"]);
      nameIdx = col(headers, ["name"]);
      firstIdx = col(headers, ["first name", "first_name"]);
      lastIdx = col(headers, ["last name", "last_name"]);
  }
  return { emailIdx, statusIdx, nameIdx, firstIdx, lastIdx };
}

/** Parses a subscriber-export CSV into canonical rows. `platformHint` overrides auto-detection. */
export function parseSubscriberCsv(text: string, platformHint?: ImportPlatform): ImportParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { platform: "generic", rows: [], skipped: [] };

  const headers = rows[0];
  const platform = platformHint && platformHint !== "generic" ? platformHint : detectPlatform(headers);
  const { emailIdx, statusIdx, nameIdx, firstIdx, lastIdx } = columnsFor(platform, headers);

  const out: CanonicalSubscriber[] = [];
  const skipped: { raw: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const email = (emailIdx >= 0 ? r[emailIdx] : r[0] ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      skipped.push({ raw: r.join(","), reason: "missing or invalid email" });
      continue;
    }
    if (seen.has(email)) continue; // de-dupe within the file
    seen.add(email);

    const status: CanonicalStatus = statusIdx >= 0 ? normalizeStatus(platform, r[statusIdx] ?? "") : "pending";

    let name: string | null = null;
    if (nameIdx >= 0 && r[nameIdx]?.trim()) name = r[nameIdx].trim();
    else {
      const parts = [firstIdx >= 0 ? r[firstIdx] : "", lastIdx >= 0 ? r[lastIdx] : ""].map((p) => (p ?? "").trim()).filter(Boolean);
      if (parts.length) name = parts.join(" ");
    }

    out.push({ email, status, name, source: platform });
  }

  return { platform, rows: out, skipped };
}
