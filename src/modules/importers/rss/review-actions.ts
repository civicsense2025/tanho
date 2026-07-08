"use server";

import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { makeBlockIdFactory } from "@/modules/importers/shared/block-id";
import { commitPages, type PageCandidate } from "@/modules/importers/shared/commit-pages";
import type { ParseIssue, Result } from "@/modules/importers/shared/types";
import { parseFeed } from "./parse";
import { mapFeedItem } from "./map";
import { fetchFeed } from "./fetch-feed.server";
// RssDryRunSummary lives in ./map — a "use server" module may only export async functions.
import type { RssDryRunSummary } from "./map";

/**
 * Resolve the feed XML from EITHER an uploaded xml string (args.xml) or a feed
 * URL (args.url, fetched through the SSRF-hardened fetchFeed). A URL is
 * preferred when both are somehow present; neither is an error. The fetch's
 * `{ok:false}` is passed straight through, so an SSRF-blocked / unreachable
 * host surfaces its own message.
 */
async function resolveFeedXml(args: { xml?: string; url?: string }): Promise<Result<string>> {
  const url = args.url?.trim();
  if (url) {
    const fetched = await fetchFeed(url);
    if (!fetched.ok) return fetched;
    return { ok: true, data: fetched.data };
  }
  if (args.xml && args.xml.trim()) return { ok: true, data: args.xml };
  return { ok: false, error: "Provide a feed URL or an XML file" };
}

/**
 * Preview an RSS/Atom import — fetch/parse + map only, no DB writes. Lets the
 * operator see the item count and any parse issues (malformed items, empty
 * bodies, normalized slugs) before committing, matching the two-step flow every
 * other importer uses.
 */
export async function dryRunRssImport(args: { xml?: string; url?: string }): Promise<Result<RssDryRunSummary>> {
  await requireUser("owner");
  const ids = makeBlockIdFactory("rss");
  ids.reset();

  const xml = await resolveFeedXml(args);
  if (!xml.ok) return xml;

  const parsed = parseFeed(xml.data!);
  if (!parsed.ok) return parsed;

  const issues: ParseIssue[] = [...parsed.data!.issues];
  for (const item of parsed.data!.items) {
    const { issues: itemIssues } = await mapFeedItem(item, ids.nextId);
    issues.push(...itemIssues);
  }

  return { ok: true, data: { itemCount: parsed.data!.items.length, issues } };
}

/**
 * Commit an RSS/Atom import: one Lamina post per feed item (skipping a route
 * that's already taken rather than overwriting), 301s from each item's source
 * permalink, then one safety receipt + audit row. Idempotent on re-runs — a
 * route that already exists is reported as a collision, never duplicated (via
 * the shared commit loop).
 */
export async function commitRssImport(args: { xml?: string; url?: string }): Promise<Result<{ receiptId: string }>> {
  const user = await requireUser("owner");
  const ids = makeBlockIdFactory("rss");
  ids.reset();

  const xml = await resolveFeedXml(args);
  if (!xml.ok) return xml;

  const parsed = parseFeed(xml.data!);
  if (!parsed.ok) return parsed;

  const issues: ParseIssue[] = [...parsed.data!.issues];
  const pages: PageCandidate[] = [];
  for (const item of parsed.data!.items) {
    const { page, issues: itemIssues } = await mapFeedItem(item, ids.nextId);
    pages.push(page);
    issues.push(...itemIssues);
  }

  const { receiptId } = await commitPages({ source: "rss", pages, issues });

  await writeAudit({
    userId: user.id,
    action: "import.rss",
    ownerType: "import_receipt",
    ownerId: receiptId,
    meta: { pages: pages.length, via: args.url ? "url" : "file" },
  });

  return { ok: true, data: { receiptId } };
}
