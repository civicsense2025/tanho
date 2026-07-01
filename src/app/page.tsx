import { readPageBlocks } from "@/lib/content/store";
import { HomepageBlockTree } from "@/components/homepage/HomepageBlockTree";
import { parseBlocks } from "@/lib/blocks/core/validate";
import { getPage, getSeoTemplate } from "@/lib/db";
import { absoluteUrl, buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [page, template] = await Promise.all([getPage("home"), getSeoTemplate("page")]);
  // No pages row yet (no admin UI to create one) -- fall back to layout.tsx's
  // static site-wide metadata by returning nothing to override.
  if (!page) return {};
  return buildMetadata(page, { title: page.title, path: "/" }, template);
}

export default async function Home() {
  const [raw, page, template, settings] = await Promise.all([
    readPageBlocks("home"),
    getPage("home"),
    getSeoTemplate("page"),
    getSettings(),
  ]);
  // Validated at the trust boundary: malformed/unknown blocks are dropped with a warning rather
  // than crashing the homepage (see parseBlocks). Replaces the old unchecked JSON.parse.
  const blocks = raw ? parseBlocks(raw) : [];

  // Reuse the exact same override/template/fallback-resolved metadata that generateMetadata()
  // computed for <head>, so the JSON-LD name/description never diverges from the visible SEO tags.
  // Falls back to getSettings()'s site-wide identity (matches layout.tsx's <head>) when there's
  // no `pages` row yet to resolve title/description from.
  const resolved = page ? buildMetadata(page, { title: page.title, path: "/" }, template) : null;
  const name = (resolved?.title as string) || settings.title;
  const description = (resolved?.description as string) || settings.description;

  return (
    <main style={{ maxWidth: "var(--width-content)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name,
            description,
            url: SITE_URL,
          },
          url: absoluteUrl("/"),
        }}
      />
      <HomepageBlockTree blocks={blocks} />
    </main>
  );
}
