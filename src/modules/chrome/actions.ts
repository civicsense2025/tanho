"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { blockSets } from "@/modules/pages/schema";
import { CHROME_OWNER_ID, chromeTag, isChromeOwnerType, type ChromeOwnerType } from "./owners";

type Result = { ok: true } | { ok: false; error: string };

/** Guard: owner-only, and the ownerType must be a real chrome owner. */
async function guard(ownerType: string): Promise<{ ok: true; owner: ChromeOwnerType } | { ok: false; error: string }> {
  await requireUser("owner");
  if (!isChromeOwnerType(ownerType)) return { ok: false, error: "Unknown chrome owner" };
  return { ok: true, owner: ownerType };
}

/**
 * Autosave the DRAFT chrome tree — the exact mirror of pages' saveDraftBlocks,
 * writing the same block_sets table under the chrome owner. The tree is
 * validated (fail closed) before it lands.
 */
export async function saveDraftChrome(ownerType: string, tree: unknown): Promise<Result> {
  const g = await guard(ownerType);
  if (!g.ok) return g;
  const v = validateBlockTree(tree);
  if (!v.ok) return { ok: false, error: v.error };
  const user = await requireUser("owner");
  await db
    .insert(blockSets)
    .values({
      ownerType: g.owner,
      ownerId: CHROME_OWNER_ID,
      variant: "draft",
      blocks: v.blocks,
      savedAt: Date.now(),
      savedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
    });
  return { ok: true };
}

/**
 * Publish = copy draft → published + invalidate the owner's cache tag, so the
 * public layout picks up the new header/footer. Mirrors publishPage (minus the
 * page-specific paywall/media-usage steps — chrome has neither).
 */
export async function publishChrome(ownerType: string): Promise<Result> {
  const g = await guard(ownerType);
  if (!g.ok) return g;
  const user = await requireUser("owner");
  const draft = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, g.owner),
      eq(blockSets.ownerId, CHROME_OWNER_ID),
      eq(blockSets.variant, "draft"),
    ),
  });
  const v = validateBlockTree(draft?.blocks ?? []);
  if (!v.ok) return { ok: false, error: v.error };

  await db
    .insert(blockSets)
    .values({
      ownerType: g.owner,
      ownerId: CHROME_OWNER_ID,
      variant: "published",
      blocks: v.blocks,
      savedAt: Date.now(),
      savedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
    });
  await writeAudit({ userId: user.id, action: "chrome.publish", ownerType: g.owner, ownerId: CHROME_OWNER_ID });
  updateTag(chromeTag(g.owner));
  return { ok: true };
}
