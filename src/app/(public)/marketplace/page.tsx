import type { Metadata } from "next";
import Link from "next/link";
import { getMarketplaceSettings } from "@/modules/marketplace/queries";
import {
  PACK_TYPE_BY_URL,
  requireMarketplacePublic,
  buildPackMetaList,
  type PackMeta,
} from "@/modules/marketplace/public";
import { listPublishedEntries } from "@/modules/entries/queries";
import { buildPageMetadata } from "@/modules/seo";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getMarketplaceSettings();
  if (!s.enabled || s.visibility !== "public") return {};
  // The `page` template renders `{title} · {site}`, so pass just the
  // marketplace name; buildPageMetadata adds OG/twitter/canonical/robots.
  return buildPageMetadata({
    contentType: "page",
    title: s.name || "Marketplace",
    excerpt: s.description || undefined,
    path: "/marketplace",
  });
}

/**
 * Public marketplace catalog — lists every published block_pack and
 * design_pack on this instance. Only renders when the marketplace is enabled
 * and visibility is "public"; otherwise 404.
 */
export default async function MarketplaceCatalogPage() {
  await requireMarketplacePublic();
  const s = await getMarketplaceSettings();

  const [blockPacks, designPacks] = await Promise.all([
    listPublishedEntries(PACK_TYPE_BY_URL["block-pack"]),
    listPublishedEntries(PACK_TYPE_BY_URL["design-pack"]),
  ]);
  const packs = await buildPackMetaList(blockPacks, designPacks);

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "var(--space-12) var(--gutter)",
      }}
    >
      <h1
        style={{
          margin: "0 0 var(--space-2)",
          fontSize: "var(--text-h1)",
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        {s.name || "Marketplace"}
      </h1>
      {s.description ? (
        <p
          style={{
            margin: "0 0 var(--space-8)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            maxWidth: "44rem",
          }}
        >
          {s.description}
        </p>
      ) : (
        <div style={{ height: "var(--space-8)" }} />
      )}

      {packs.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          No packs published yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "var(--space-5)",
          }}
        >
          {packs.map((p) => (
            <PackCard key={`${p.type}/${p.slug}`} pack={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

function PackCard({ pack }: { pack: PackMeta }) {
  return (
    <li
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "var(--text-2xs)",
            fontFamily: "var(--font-label)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-muted)",
          }}
        >
          {pack.type === "block-pack" ? "Block pack" : "Design pack"}
        </span>
        {pack.source !== "local" ? (
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
            · {pack.source}
          </span>
        ) : null}
      </div>
      <Link
        href={`/marketplace/${pack.type}/${pack.slug}`}
        style={{ textDecoration: "none", color: "var(--text)", fontSize: "var(--text-body)", fontWeight: 500 }}
      >
        {pack.title}
      </Link>
      {pack.description ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {pack.description}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "auto" }}>
        <Link
          href={`/marketplace/${pack.type}/${pack.slug}/download`}
          style={{ fontSize: "var(--text-xs)", color: "var(--accent)", textDecoration: "none" }}
        >
          Download .pack.json
        </Link>
      </div>
    </li>
  );
}
