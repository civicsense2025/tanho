import Link from "next/link";

export const metadata = { title: "Coming soon" };

/**
 * The public "setup in progress" screen. The site-lock proxy (src/proxy.ts)
 * redirects every public visitor here until first-run install is finished, so a
 * half-configured deployment never shows a broken or empty site. Deliberately
 * self-contained (no DB reads, no chrome dependency) so it renders even before
 * anything is seeded. The owner reaches the actual setup at /admin/install.
 */
export default function SetupInProgressPage() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "var(--space-3)",
        padding: "var(--space-12) var(--gutter)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-widest)",
          color: "var(--text-faint)",
        }}
      >
        Coming soon
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-h2)",
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
          color: "var(--text)",
          maxWidth: "var(--width-prose)",
        }}
      >
        This site is being set up.
      </h1>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "42ch" }}>
        Check back shortly. If you&apos;re the owner, finish first-run setup to
        open the site to visitors.
      </p>
      <Link
        href="/admin/install"
        style={{ fontSize: "var(--text-sm)", color: "var(--accent)", textDecoration: "none" }}
      >
        Set up your site →
      </Link>
    </main>
  );
}
