import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketplaceSettings } from "@/modules/marketplace/queries";
import {
  PACK_TYPE_BY_URL,
  PACK_URL_TYPES,
  requireMarketplacePublic,
  type PackUrlType,
} from "@/modules/marketplace/public";
import { getPublishedEntry } from "@/modules/entries/queries";
import { buildPageMetadata } from "@/modules/seo";

type Params = { type: string; slug: string };

function resolveType(type: string): PackUrlType | null {
  return (PACK_URL_TYPES as string[]).includes(type) ? (type as PackUrlType) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { type, slug } = await params;
  const urlType = resolveType(type);
  if (!urlType) return {};
  const s = await getMarketplaceSettings();
  if (!s.enabled || s.visibility !== "public") return {};
  const entry = await getPublishedEntry(PACK_TYPE_BY_URL[urlType], slug);
  if (!entry) return {};
  // Fold the marketplace name into the title token; the `page` template adds
  // the site name and buildPageMetadata supplies OG/twitter/canonical/robots.
  return buildPageMetadata({
    contentType: "page",
    title: `${entry.title} · ${s.name || "Marketplace"}`,
    excerpt: (entry.data as { description?: string })?.description || undefined,
    path: `/marketplace/${type}/${slug}`,
  });
}

/**
 * Public marketplace pack detail — metadata + a download link for one pack.
 * Only renders when the marketplace is enabled and public. Under Cache
 * Components, the async body is wrapped in <Suspense> so its request-scoped
 * settings/entry lookups don't force the whole route into a prerender error.
 */
export default function MarketplacePackPage({
  params,
}: {
  params: Promise<Params>;
}) {
  return (
    <Suspense fallback={null}>
      <MarketplacePackPageInner params={params} />
    </Suspense>
  );
}

async function MarketplacePackPageInner({
  params,
}: {
  params: Promise<Params>;
}) {
  await requireMarketplacePublic();
  const { type, slug } = await params;
  const urlType = resolveType(type);
  if (!urlType) notFound();

  const entry = await getPublishedEntry(PACK_TYPE_BY_URL[urlType], slug);
  if (!entry) notFound();

  const data = (entry.data ?? {}) as {
    description?: string;
    source?: string;
    requiredTypes?: string[];
    packVersion?: number;
  };

  return (
    <main
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "var(--space-12) var(--gutter)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "var(--text-2xs)",
            fontFamily: "var(--font-label)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-muted)",
          }}
        >
          {urlType === "block-pack" ? "Block pack" : "Design pack"}
        </span>
        {data.source && data.source !== "local" ? (
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
            · {data.source}
          </span>
        ) : null}
        {typeof data.packVersion === "number" ? (
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
            · v{data.packVersion}
          </span>
        ) : null}
      </div>

      <h1
        style={{
          margin: "0 0 var(--space-3)",
          fontSize: "var(--text-h1)",
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        {entry.title}
      </h1>

      {data.description ? (
        <p
          style={{
            margin: "0 0 var(--space-8)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            maxWidth: "44rem",
          }}
        >
          {data.description}
        </p>
      ) : (
        <div style={{ height: "var(--space-8)" }} />
      )}

      {data.requiredTypes && data.requiredTypes.length > 0 ? (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h2
            style={{
              margin: "0 0 var(--space-2)",
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-label)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-muted)",
            }}
          >
            Required block types
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {data.requiredTypes.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: "var(--text-2xs)",
                  fontFamily: "var(--font-label)",
                  padding: "2px var(--space-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-muted)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Link
        href={`/marketplace/${urlType}/${slug}/download`}
        style={{
          display: "inline-block",
          fontSize: "var(--text-sm)",
          color: "var(--accent)",
          textDecoration: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-2) var(--space-4)",
        }}
      >
        Download .pack.json
      </Link>

      <div style={{ marginTop: "var(--space-8)" }}>
        <Link
          href="/marketplace"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          ← Back to marketplace
        </Link>
      </div>
    </main>
  );
}
