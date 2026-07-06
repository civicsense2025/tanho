"use server";

import { createId } from "@paralleldrive/cuid2";
import { updateTag } from "next/cache";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { redirects } from "./schema";
import { isSameOriginPath, normalizePath, redirectInputSchema } from "./validation";
import { resetRedirectRulesMemo } from "./loader";
import { listRedirects } from "./queries";
import {
  parsePastedList,
  parseCsv,
  parseSitemapXml,
  proposeMappings,
  sortForReview,
  type MappingProposal,
  type SourceRow,
} from "./bulk-mapping";
import { buildSafetyReport, type SafetyReport, type SafetyRule } from "./safety";
import { enumerateKnownTargets } from "./known-targets.server";
import { fetchSitemap } from "./fetch-sitemap.server";

export type RedirectActionState = { ok?: boolean; error?: string; id?: string };

/** Local Result shape (matches modules/pages/actions.ts). Not exported — a
 *  "use server" module may only export async functions. */
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Create or update a redirect. Owner-only; zod-validated (same-origin); unique fromPath. */
export async function saveRedirect(
  id: string | null,
  data: unknown,
): Promise<RedirectActionState> {
  const user = await requireUser("owner");

  const parsed = redirectInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid redirect" };
  }
  const input = parsed.data;

  const clash = await db.query.redirects.findFirst({
    where: id
      ? and(eq(redirects.fromPath, input.fromPath), ne(redirects.id, id))
      : eq(redirects.fromPath, input.fromPath),
    columns: { id: true },
  });
  if (clash) return { error: `A redirect from "${input.fromPath}" already exists` };

  let savedId = id ?? "";
  if (id) {
    await db.update(redirects).set(input).where(eq(redirects.id, id));
  } else {
    const [row] = await db
      .insert(redirects)
      .values(input)
      .returning({ id: redirects.id });
    savedId = row?.id ?? "";
  }

  updateTag("redirects");
  resetRedirectRulesMemo(); // apply the edit to the proxy's in-process rule set now
  await writeAudit({
    userId: user.id,
    action: id ? "redirect.update" : "redirect.create",
    ownerType: "redirect",
    ownerId: savedId,
  });
  return { ok: true, id: savedId };
}

/** Delete a redirect. Owner-only. */
export async function deleteRedirect(id: string): Promise<RedirectActionState> {
  const user = await requireUser("owner");
  await db.delete(redirects).where(eq(redirects.id, id));
  updateTag("redirects");
  resetRedirectRulesMemo(); // apply the edit to the proxy's in-process rule set now
  await writeAudit({
    userId: user.id,
    action: "redirect.delete",
    ownerType: "redirect",
    ownerId: id,
  });
  return { ok: true };
}

/* ----------------------------------------------------------- bulk migration */

/** Existing redirect rules as safety edges (from → to|null; gone rules → null). */
async function existingSafetyEdges(): Promise<SafetyRule[]> {
  const rows = await listRedirects();
  return rows.map((r) => ({
    from: r.fromPath,
    to: r.kind === "gone" ? null : r.destination || r.toPath,
  }));
}

const proposeInputSchema = z.object({
  mode: z.enum(["paste", "csv", "sitemap-url"]),
  text: z.string().max(2_000_000).optional(),
  url: z.string().max(2000).optional(),
});

/**
 * DRY-RUN: parse the pasted list / CSV / fetched sitemap into proposed exact
 * redirects and run the safety validators. NO writes. Owner-only. The sitemap
 * URL is fetched through the SSRF-guarded fetcher (fetch-sitemap.server.ts).
 */
export async function proposeBulkRedirects(
  input: unknown,
): Promise<Result<{ proposals: MappingProposal[]; safety: SafetyReport }>> {
  await requireUser("owner");

  const parsed = proposeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { mode, text, url } = parsed.data;

  let sources: SourceRow[];
  if (mode === "paste") {
    sources = parsePastedList(text ?? "");
  } else if (mode === "csv") {
    sources = parseCsv(text ?? "");
  } else {
    if (!url) return { ok: false, error: "A sitemap URL is required" };
    const fetched = await fetchSitemap(url);
    if (!fetched.ok) return { ok: false, error: fetched.error };
    sources = parseSitemapXml(fetched.xml).map((from) => ({ from }));
  }

  if (sources.length === 0) {
    return { ok: false, error: "No source paths were found in that input" };
  }

  const knownTargets = await enumerateKnownTargets();
  const proposals = sortForReview(proposeMappings(sources, knownTargets));

  // Safety over the proposed edges (excluding identity no-ops) + existing rules.
  const batchEdges: SafetyRule[] = proposals
    .filter((p) => p.reason !== "identity")
    .map((p) => ({ from: p.from, to: p.to }));
  const safety = buildSafetyReport(
    batchEdges,
    await existingSafetyEdges(),
    knownTargets,
    knownTargets,
  );

  return { ok: true, data: { proposals, safety } };
}

const commitRowSchema = z.object({
  from: z.string().min(1).max(2000),
  to: z.string().max(2000).nullable(),
});
const commitInputSchema = z.object({
  rows: z.array(commitRowSchema).min(1).max(50_000),
});

/**
 * COMMIT: insert the reviewed rows as exact redirects in ONE idempotent batch,
 * tagged with a shared `sourceBatch` id so the whole migration can roll back
 * as a unit. A row with a target → 301 redirect; a row with `to:null` → 410
 * gone. Identity rows are skipped, off-origin targets rejected. Blocked when
 * the (server-recomputed) safety report has errors. Owner-only.
 */
export async function commitBulkRedirects(
  input: unknown,
): Promise<Result<{ count: number; batch: string }>> {
  const user = await requireUser("owner");

  const parsed = commitInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Validate + normalize each row: same-origin from, skip identity, coerce an
  // invalid/off-origin target to a Gone rule rather than storing an open path.
  const clean: { from: string; to: string | null }[] = [];
  const seen = new Set<string>();
  for (const row of parsed.data.rows) {
    if (!isSameOriginPath(row.from)) {
      return { ok: false, error: `Source "${row.from}" must be a site-relative path` };
    }
    const to = row.to && isSameOriginPath(row.to) ? row.to : null;
    if (to && normalizePath(row.from) === normalizePath(to)) continue; // identity — skip
    const key = normalizePath(row.from);
    if (seen.has(key)) continue; // de-dupe within the batch (unique fromPath)
    seen.add(key);
    clean.push({ from: row.from, to });
  }

  if (clean.length === 0) {
    return { ok: false, error: "Nothing to commit after removing identity/duplicate rows" };
  }

  // Re-run safety server-side — the client cannot be trusted to have blocked on
  // errors. Errors abort the commit.
  const knownTargets = await enumerateKnownTargets();
  const safety = buildSafetyReport(
    clean,
    await existingSafetyEdges(),
    knownTargets,
    knownTargets,
  );
  if (safety.errors.length > 0) {
    return {
      ok: false,
      error: `Cannot commit: ${safety.errors[0]!.detail}${
        safety.errors.length > 1 ? ` (+${safety.errors.length - 1} more)` : ""
      }`,
    };
  }

  const batch = createId();
  const values = clean.map((r) => ({
    fromPath: r.from,
    toPath: r.to ?? r.from, // toPath is NOT NULL; a gone rule keeps from as a placeholder
    code: r.to ? 301 : 410,
    matchType: "exact" as const,
    kind: (r.to ? "redirect" : "gone") as "redirect" | "gone",
    destination: r.to,
    sourceBatch: batch,
    autoCreatedFrom: "bulk-import",
  }));

  // One insert; onConflictDoNothing makes a re-run idempotent (fromPath unique).
  await db.insert(redirects).values(values).onConflictDoNothing();

  updateTag("redirects");
  resetRedirectRulesMemo();
  await writeAudit({
    userId: user.id,
    action: "redirect.bulk-import",
    ownerType: "redirect",
    ownerId: batch,
    meta: { count: values.length, batch },
  });

  return { ok: true, data: { count: values.length, batch } };
}

/** Roll back a whole bulk-import batch by its `sourceBatch` id. Owner-only. */
export async function rollbackRedirectBatch(batch: string): Promise<Result<{ deleted: number }>> {
  const user = await requireUser("owner");
  if (!batch) return { ok: false, error: "A batch id is required" };

  const deleted = await db
    .delete(redirects)
    .where(eq(redirects.sourceBatch, batch))
    .returning({ id: redirects.id });

  updateTag("redirects");
  resetRedirectRulesMemo();
  await writeAudit({
    userId: user.id,
    action: "redirect.bulk-rollback",
    ownerType: "redirect",
    ownerId: batch,
    meta: { deleted: deleted.length, batch },
  });

  return { ok: true, data: { deleted: deleted.length } };
}
