import { readPageBlocks } from "@/lib/content/store";
import { HomepageBlockTree } from "@/components/homepage/HomepageBlockTree";
import { parseBlocks } from "@/lib/blocks/core/validate";
import { getContentEntry } from "@/lib/db";
import { absoluteUrl, buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const entry = await getContentEntry("page", "home");
  if (!entry || entry.status !== "published") return {};
  return buildMetadata(entry, { title: entry.title, path: "/" });
}

export default async function Home() {
  const [raw, entry, settings] = await Promise.all([
    readPageBlocks("home"),
    getContentEntry("page", "home"),
    getSettings(),
  ]);
  const blocks = raw ? parseBlocks(raw) : [];

  const resolved = entry && entry.status === "published" ? buildMetadata(entry, { title: entry.title, path: "/" }) : null;
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
