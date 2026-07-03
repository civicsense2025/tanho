/**
 * Worked example of a code-defined page (see ../registry.tsx for how these
 * are wired up). This is a plain server component, not a block page — a
 * developer owns this file directly instead of editing it through the CMS.
 *
 * It reads NO cookies and no per-request data, so it stays fully static:
 * cached and served identically to every visitor, same as a block page
 * with no paywall.
 */
export function AboutExample() {
  return (
    <main
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "var(--space-10) var(--gutter)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--text-muted)",
        }}
      >
        Code page
      </span>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-h1)",
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        This page is written in code
      </h1>
      <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Most pages on this site are built with the block editor and stored in the
        database. This one is different: it&apos;s a server component living at{" "}
        <code style={{ fontFamily: "var(--font-mono)" }}>
          src/app/(public)/code-pages/examples/AboutExample.tsx
        </code>
        , registered in the code-page registry instead of the pages table.
      </p>
      <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Use this escape hatch when a page needs a layout, data source, or
        interaction the block editor can&apos;t express. Because it reads no
        cookies, it renders once and is served statically to every visitor,
        just like an un-paywalled block page.
      </p>
    </main>
  );
}
