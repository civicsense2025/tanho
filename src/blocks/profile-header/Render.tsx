import type { RenderCtx } from "../types";
import { initialsOf, boundPlaceholder } from "../bound-common";
import type { ProfileHeaderContent } from "./fields";
import type { ProfileHeaderResolved } from "./resolve";

/** Home hero: avatar circle, name (display tight), bio paragraph. */
export function RenderProfileHeader({
  content,
  ctx,
}: {
  content: ProfileHeaderContent & { _resolved?: ProfileHeaderResolved | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Profile header", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const data = content._resolved;
  if (!data) return null;

  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div
        aria-hidden={data.avatarUrl ? undefined : true}
        style={{
          width: "5rem",
          height: "5rem",
          borderRadius: "var(--radius-pill)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-lg)",
          fontWeight: "var(--weight-medium)" as never,
        }}
      >
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.avatarUrl}
            alt={data.avatarAlt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initialsOf(data.name)
        )}
      </div>
      {data.name ? (
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-display)",
            fontWeight: "var(--weight-medium)" as never,
            letterSpacing: "var(--tracking-tight)",
            lineHeight: "var(--leading-tight)",
          }}
        >
          {data.name}
        </h1>
      ) : null}
      {data.bio ? (
        <p
          style={{
            margin: 0,
            maxWidth: "40rem",
            color: "var(--text-muted)",
            fontSize: "var(--text-lg)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          {data.bio}
        </p>
      ) : null}
    </header>
  );
}
