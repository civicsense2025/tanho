import { listPosts } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { TextLink } from "@/components/ui";
import { SubscribeForm } from "@/components/SubscribeForm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Recent posts and issues.",
};

/** Formats an ISO date for display; tolerant of null. */
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function PostsPage() {
  // Feature-gated: when newsletter is off, this section doesn't exist.
  const settings = await getSettings();
  if (!settings.features.newsletter) notFound();

  const posts = await listPosts(true);

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/" style={{ fontSize: "var(--text-xs)" }}>
          Back
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          Newsletter
        </h1>
        <SubscribeForm />
      </header>

      {posts.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No posts yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {posts.map((p) => (
            <article key={p.id}>
              <Link href={`/posts/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <h2 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-h2)", fontWeight: 500, color: "var(--text)" }}>
                  {p.title}
                  {p.visibility === "paid" && (
                    <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-2xs)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--accent)" }}>
                      Paid
                    </span>
                  )}
                </h2>
              </Link>
              {p.publishedAt && (
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>{fmtDate(p.publishedAt)}</div>
              )}
              {p.excerpt && <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: "var(--leading-normal)" }}>{p.excerpt}</p>}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
