import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/modules/auth/guards";
import { db } from "@/lib/db/client";
import { entries } from "@/modules/entries/schema";
import { blockSets } from "@/modules/pages/schema";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { AdminPage } from "@/components/admin/AdminPage";
import type { BlockNode } from "@/blocks/types";

export const metadata = { title: "Block pack" };

/** Read-only preview of a block pack's published tree + its metadata. */
export default async function BlockPackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!entry || entry.type !== "block_pack") notFound();
  const set = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, "entry:block_pack"),
      eq(blockSets.ownerId, id),
      eq(blockSets.variant, "published"),
    ),
  });
  const blocks = (set?.blocks ?? []) as BlockNode[];
  const data = entry.data as { source?: string; packVersion?: number; requiredTypes?: string[]; description?: string };

  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never }}>{entry.title}</h1>
        <Link href="/admin/block-packs" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>← All block packs</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        <span>Source: {data.source ?? "local"} · Version: {data.packVersion ?? 1}</span>
        {data.description ? <span>{data.description}</span> : null}
        {(data.requiredTypes ?? []).length ? (
          <span>Block types: {(data.requiredTypes ?? []).join(", ")}</span>
        ) : null}
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", background: "var(--surface-card)" }}>
        <RenderBlocks blocks={blocks} mode="editor" />
      </div>
    </AdminPage>
  );
}
