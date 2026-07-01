import { readPageBlocks } from "@/lib/content/store";
import { HomepageBlockTree } from "@/components/homepage/HomepageBlockTree";
import type { HomepageBlock } from "@/components/homepage/registry";
import { getPage, getSeoTemplate } from "@/lib/db";
import { absoluteUrl, buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Site-wide fallback identity (matches layout.tsx's static <head> metadata) used for the
// Person/ProfilePage JSON-LD when there's no `pages` row yet to resolve title/description from.
const SITE_TITLE = "Tan Ho — Product Designer & Digital Marketer";
const SITE_DESCRIPTION =
  "I'm a Forbes 30 Under 30 product designer and front-end developer. I co-founded Fiveable, scaled it to 15M+ students, and secured $15M in funding. I build products at the intersection of design, growth, and engineering.";

export async function generateMetadata(): Promise<Metadata> {
  const [page, template] = await Promise.all([getPage("home"), getSeoTemplate("page")]);
  // No pages row yet (no admin UI to create one) -- fall back to layout.tsx's
  // static site-wide metadata by returning nothing to override.
  if (!page) return {};
  return buildMetadata(page, { title: page.title, path: "/" }, template);
}

export default async function Home() {
  const [raw, page, template] = await Promise.all([readPageBlocks("home"), getPage("home"), getSeoTemplate("page")]);
  const blocks: HomepageBlock[] = raw ? JSON.parse(raw).blocks : [];

  // Reuse the exact same override/template/fallback-resolved metadata that generateMetadata()
  // computed for <head>, so the JSON-LD name/description never diverges from the visible SEO tags.
  const resolved = page ? buildMetadata(page, { title: page.title, path: "/" }, template) : null;
  const name = (resolved?.title as string) || SITE_TITLE;
  const description = (resolved?.description as string) || SITE_DESCRIPTION;

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
