import { readPageBlocks } from "@/lib/content/store";
import { HomepageBlockTree } from "@/components/homepage/HomepageBlockTree";
import type { HomepageBlock } from "@/components/homepage/registry";
import { getPage } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  // No pages row yet (no admin UI to create one) -- fall back to layout.tsx's
  // static site-wide metadata by returning nothing to override.
  if (!page) return {};
  return buildMetadata(page, { title: page.title });
}

export default async function Home() {
  const raw = await readPageBlocks("home");
  const blocks: HomepageBlock[] = raw ? JSON.parse(raw).blocks : [];

  return (
    <main style={{ maxWidth: "var(--width-content)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <HomepageBlockTree blocks={blocks} />
    </main>
  );
}
