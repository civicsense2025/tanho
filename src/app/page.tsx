import { readPageBlocks } from "@/lib/content/store";
import { HomepageBlockTree } from "@/components/homepage/HomepageBlockTree";
import type { HomepageBlock } from "@/components/homepage/registry";

export const dynamic = "force-dynamic";

export default async function Home() {
  const raw = await readPageBlocks("home");
  const blocks: HomepageBlock[] = raw ? JSON.parse(raw).blocks : [];

  return (
    <main style={{ maxWidth: "var(--width-content)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <HomepageBlockTree blocks={blocks} />
    </main>
  );
}
