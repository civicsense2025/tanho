import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminSession } from "@/lib/auth";
import { getSubscriberByEmail, createSubscriber, updateSubscriber } from "@/lib/db";
import { parseSubscriberCsv, type ImportPlatform } from "@/lib/import/subscribers";
import { siteConfig } from "@/config/site.config";

const PLATFORMS: ImportPlatform[] = ["substack", "mailchimp", "ghost", "buttondown", "kit", "beehiiv", "generic"];

/**
 * Admin subscriber import from a platform CSV export. Body: { csv: string, platform?: string }.
 * Parses/normalizes with the canonical mapper, then upserts. Imported subscribers keep their
 * original (normalized) status — an import is not a re-subscribe, so we never flip an
 * unsubscribed contact back to active, and unknown statuses land as `pending`.
 */
export async function POST(req: NextRequest) {
  if (!siteConfig.features.newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const csv = body?.csv;
  if (typeof csv !== "string" || csv.length === 0) {
    return NextResponse.json({ error: "csv (string) is required" }, { status: 400 });
  }
  const platformHint = PLATFORMS.includes(body?.platform) ? (body.platform as ImportPlatform) : undefined;

  const result = parseSubscriberCsv(csv, platformHint);

  let created = 0;
  let updated = 0;
  for (const row of result.rows) {
    const existing = await getSubscriberByEmail(row.email);
    if (existing) {
      // Never resurrect an unsubscribed contact via import; otherwise sync the status forward.
      if (existing.status === "unsubscribed") continue;
      if (existing.status !== row.status) {
        await updateSubscriber(existing.id, { status: row.status });
        updated++;
      }
      continue;
    }
    await createSubscriber({
      email: row.email,
      status: row.status,
      confirmToken: row.status === "pending" ? randomUUID() : null,
      unsubscribeToken: randomUUID(),
      source: `import:${result.platform}`,
    });
    created++;
  }

  return NextResponse.json({
    platform: result.platform,
    parsed: result.rows.length,
    created,
    updated,
    skipped: result.skipped.length,
  });
}
