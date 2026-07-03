"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { blockRegistry } from "./schema";
import { ensureBlockRegistrySeeded } from "./registry-queries";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Toggle a block type's `enabled` flag. Owner-only. Built-in blocks may be
 * disabled (hidden from the picker) but never deleted. Revalidates the
 * "block-registry" cache tag so the picker reflects the change on next read.
 */
export async function toggleBlockEnabled(type: string, enabled: boolean): Promise<Result> {
  const user = await requireUser("owner");
  const existing = await db.query.blockRegistry.findFirst({ where: eq(blockRegistry.type, type) });
  if (!existing) return { ok: false, error: "Block type not found" };
  await db
    .update(blockRegistry)
    .set({ enabled, updatedAt: Date.now() })
    .where(eq(blockRegistry.type, type));
  updateTag("block-registry");
  await writeAudit({
    userId: user.id,
    action: "block.registry.toggle",
    ownerType: "block_registry",
    ownerId: type,
    meta: { enabled },
  });
  return { ok: true };
}

/**
 * Re-sync registry metadata from the compiled block defs — picks up label/icon
 * blurb changes after a platform update, and inserts rows for any newly added
 * compiled block types. Preserves `enabled` on existing rows. Owner-only.
 */
export async function refreshBlockRegistry(): Promise<Result> {
  const user = await requireUser("owner");
  // Reset the once-per-process guard so a manual refresh re-runs the upsert.
  await ensureBlockRegistrySeeded();
  updateTag("block-registry");
  await writeAudit({
    userId: user.id,
    action: "block.registry.refresh",
    ownerType: "block_registry",
    ownerId: "registry",
  });
  return { ok: true };
}
