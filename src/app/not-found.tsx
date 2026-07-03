import Link from "next/link";
import { getGeneralSettings } from "@/modules/settings/queries";

export const metadata = {
  robots: { index: false, follow: false },
};

/** Branded 404 — renders inside the public chrome via the (public) layout. */
export default async function NotFound() {
  const general = await getGeneralSettings();
  return (
    <main
      style={{
        maxWidth: "var(--width-prose)",
        margin: "0 auto",
        padding: "var(--space-12) var(--gutter)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        alignItems: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-widest)",
          color: "var(--text-muted)",
        }}
      >
        404
      </p>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-h1)",
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        Page not found
      </h1>
      <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: "28rem" }}>
        That page doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "var(--space-2)",
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--accent)",
          textDecoration: "none",
        }}
      >
        ← Back to {general.name}
      </Link>
    </main>
  );
}
