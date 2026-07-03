import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { markdownToSafeHtml } from "@/lib/sanitize";
import { getPublishedPolicy } from "@/modules/policies/queries";
import { getGeneralSettings } from "@/modules/settings/queries";

// This route is already static: both queries below are "use cache" reads and it
// never calls cookies()/getViewer(). Under Cache Components the route-segment
// `dynamic` config is disallowed (and unnecessary) — caching is what makes it
// static, so we don't set it.

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = await getPublishedPolicy(slug);
  if (!policy) return {};
  const general = await getGeneralSettings();
  return {
    title: `${policy.title} · ${general.name}`,
    robots: general.indexable ? undefined : { index: false, follow: false },
  };
}

/** Public policy page — renders a published policy's title, date, and body. */
export default async function PolicyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const policy = await getPublishedPolicy(slug);
  if (!policy) notFound();

  // Body is author text; sanitised server-side before it reaches the DOM.
  const html = markdownToSafeHtml(policy.body);

  return (
    <main
      style={{
        maxWidth: "720px",
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
        {policy.title}
      </h1>
      {policy.effectiveDate ? (
        <p
          style={{
            margin: "0 0 var(--space-8)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          Effective {policy.effectiveDate}
        </p>
      ) : (
        <div style={{ height: "var(--space-8)" }} />
      )}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
