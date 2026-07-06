"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { entries } from "@/modules/entries/schema";
import { theme } from "@/modules/theme/schema";
import { pages, blockSets } from "@/modules/pages/schema";
import { validatePackTree, treeReferencedTypes } from "@/modules/pages/blocks-io";
import { slugSchema } from "@/modules/pages/validation";
import { slugify } from "@/lib/slug";
import { exportDesignPackJson, importPackJson, type PortablePack } from "../packs/portable";
import type { BlockNode } from "@/blocks/types";
import type { ThemeInput } from "@/modules/theme/validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => {
  updateTag("entries");
  updateTag("entries:design_pack");
  updateTag("design-packs");
};

const OWNER_TYPE = "entry:design_pack";

/**
 * Import a .pack.json as a new design pack. Fail-closed on the format tag;
 * lenient on unknown block types (kept as placeholders). Stores the theme +
 * page templates in the entry's `data`.
 */
export async function importDesignPack(
  raw: unknown,
  source: "imported" | "library" | "marketplace" = "imported",
  origin = "",
): Promise<
  Result<{
    id: string;
    missingTypes: string[];
    dropped: string[];
    pages: number;
  }>
> {
  const user = await requireUser("owner");
  const parsed = importPackJson(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.kind !== "design-pack") return { ok: false, error: "Not a design pack" };

  // Normalize each page's block tree (lenient import validation).
  const allMissing = new Set<string>();
  const allDropped: string[] = [];
  const pageTemplates: Array<{ name: string; route: string; blocks: BlockNode[] }> = [];
  for (const p of parsed.pages ?? []) {
    const v = validatePackTree(p.blockTree);
    if (!v.ok) return { ok: false, error: `Page "${p.name}": ${v.error}` };
    for (const t of v.missingTypes) allMissing.add(t);
    allDropped.push(...v.dropped);
    pageTemplates.push({ name: p.name, route: "/", blocks: v.blocks });
  }

  const slug = slugify(parsed.name);
  const slugCheck = slugSchema.safeParse(slug);
  if (!slugCheck.success) return { ok: false, error: "Pack name must produce a valid slug" };
  const dupe = await db.query.entries.findFirst({
    where: and(eq(entries.type, "design_pack"), eq(entries.slug, slugCheck.data)),
  });
  if (dupe) return { ok: false, error: `A design pack named "${parsed.name}" already exists` };

  const required = new Set<string>();
  for (const p of pageTemplates) for (const t of treeReferencedTypes(p.blocks)) required.add(t);

  const data = {
    description: (raw as { description?: string })?.description ?? "",
    theme: parsed.theme as ThemeInput,
    pageTemplates: pageTemplates.map((p) => ({
      name: p.name,
      route: "/",
      blocks: p.blocks as unknown as BlockNode[],
    })),
    requiredTypes: [...required],
    source,
    origin,
    packVersion: typeof (raw as { version?: number })?.version === "number" ? (raw as { version: number }).version : 1,
  };

  const [row] = await db
    .insert(entries)
    .values({
      type: "design_pack",
      slug: slugCheck.data,
      title: parsed.name,
      status: "published",
      data,
      updatedAt: Date.now(),
    })
    .returning({ id: entries.id });
  await writeAudit({
    userId: user.id,
    action: "design_pack.import",
    ownerType: OWNER_TYPE,
    ownerId: row.id,
    meta: { source, origin, missingTypes: [...allMissing] },
  });
  invalidate();
  return {
    ok: true,
    data: { id: row.id, missingTypes: [...allMissing], dropped: allDropped, pages: pageTemplates.length },
  };
}

export type PortablePackExport = PortablePack & {
  requiresConfigTypes: string[];
  excludedTypes: string[];
};

/**
 * Serialize a design pack to a portable `PortablePack` object. No auth gate —
 * the public marketplace download route calls this after resolving the entry
 * slug; the admin `exportDesignPack` wrapper adds the `requireUser()` check.
 * The result carries `requiresConfigTypes` (blocks the importer must
 * reconfigure) and `excludedTypes` (blocks stripped by the portability
 * allowlist) so the caller can surface them in the UI.
 */
export async function serializeDesignPack(
  id: string,
): Promise<Result<PortablePackExport>> {
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Design pack not found" };
  const data = existing.data as {
    description?: string;
    packVersion?: number;
    theme: ThemeInput;
    pageTemplates: Array<{ name: string; route: string; blocks: BlockNode[] }>;
  };
  const pack = exportDesignPackJson(
    existing.title,
    data.theme,
    data.pageTemplates.map((p) => ({ name: p.name, blockTree: p.blocks })),
    { description: data.description, version: data.packVersion },
    Date.now(),
  );
  return { ok: true, data: { ...pack, requiresConfigTypes: pack.requiresConfigTypes ?? [], excludedTypes: pack.excludedTypes ?? [] } };
}

/**
 * Admin export of a design pack. Owner-gated; delegates to `serializeDesignPack`.
 */
export async function exportDesignPack(
  id: string,
): Promise<Result<PortablePackExport>> {
  await requireUser();
  return serializeDesignPack(id);
}

export type ActivateDiagnostics = {
  themeApplied: boolean;
  pagesCreated: Array<{ name: string; route: string; id: string }>;
  pagesSkipped: Array<{ name: string; route: string; reason: string }>;
};

/**
 * Activate a design pack: (1) write the theme to the singleton `theme` row,
 * (2) create a page per template. Pages whose route collides with an existing
 * page are skipped (not overwritten) — recorded in `pagesSkipped`. The block
 * trees are re-validated with the strict `validateBlockTree` (not the lenient
 * pack validator) before being saved as draft+published, since they're now
 * real site content. Unknown-type blocks are stripped at this stage (the
 * design pack's placeholder blocks shouldn't become live page content).
 */
export async function activateDesignPack(id: string): Promise<Result<ActivateDiagnostics>> {
  const user = await requireUser("owner");
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Design pack not found" };
  const data = existing.data as {
    theme: ThemeInput;
    pageTemplates: Array<{ name: string; route: string; blocks: BlockNode[] }>;
  };

  // 1) Apply the theme.
  await db
    .insert(theme)
    .values({ id: "theme", ...data.theme, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: theme.id, set: { ...data.theme, updatedAt: Date.now() } });
  updateTag("theme");

  // 2) Create pages from templates.
  const created: Array<{ name: string; route: string; id: string }> = [];
  const skipped: Array<{ name: string; route: string; reason: string }> = [];

  for (const tmpl of data.pageTemplates) {
    const route = tmpl.route || `/${slugify(tmpl.name) || "page"}`;
    const routeCollision = await db.query.pages.findFirst({ where: eq(pages.route, route) });
    if (routeCollision) {
      skipped.push({ name: tmpl.name, route, reason: "Route already in use" });
      continue;
    }
    // pages.slug has its own unique() constraint independent of route — two
    // templates whose names slugify the same (or re-activating a pack whose
    // slug is already taken) would otherwise throw an unhandled constraint
    // violation mid-loop and abort every template after it. Same
    // skip-don't-overwrite handling as the route check above.
    const slug = slugify(tmpl.name) || `page-${Date.now()}`;
    const slugCollision = await db.query.pages.findFirst({ where: eq(pages.slug, slug) });
    if (slugCollision) {
      skipped.push({ name: tmpl.name, route, reason: "A page with this slug already exists" });
      continue;
    }
    const [pageRow] = await db
      .insert(pages)
      .values({
        title: tmpl.name,
        slug,
        route,
        kind: "page",
        status: "published",
        updatedAt: Date.now(),
      })
      .returning({ id: pages.id });

    // Re-validate the block tree strictly for live content. Unknown types
    // get dropped (placeholders shouldn't become live page content).
    const { validateBlockTree } = await import("@/modules/pages/blocks-io");
    const v = validateBlockTree(tmpl.blocks);
    if (!v.ok) {
      skipped.push({ name: tmpl.name, route, reason: v.error });
      continue;
    }
    await db
      .insert(blockSets)
      .values({
        ownerType: "page",
        ownerId: pageRow.id,
        variant: "draft",
        blocks: v.blocks,
        savedAt: Date.now(),
        savedBy: user.id,
      })
      .onConflictDoUpdate({
        target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
        set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
      });
    await db
      .insert(blockSets)
      .values({
        ownerType: "page",
        ownerId: pageRow.id,
        variant: "published",
        blocks: v.blocks,
        savedAt: Date.now(),
        savedBy: user.id,
      })
      .onConflictDoUpdate({
        target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
        set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
      });
    updateTag(`page:${pageRow.id}`);
    created.push({ name: tmpl.name, route, id: pageRow.id });
  }

  updateTag("pages");
  await writeAudit({
    userId: user.id,
    action: "design_pack.activate",
    ownerType: OWNER_TYPE,
    ownerId: id,
    meta: { pagesCreated: created.length, pagesSkipped: skipped.length },
  });
  return {
    ok: true,
    data: { themeApplied: true, pagesCreated: created, pagesSkipped: skipped },
  };
}

/** Delete a design pack. */
export async function deleteDesignPack(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(entries).where(eq(entries.id, id));
  await writeAudit({
    userId: user.id,
    action: "design_pack.delete",
    ownerType: OWNER_TYPE,
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}
