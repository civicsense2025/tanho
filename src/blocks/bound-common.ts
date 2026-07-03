import type { RenderCtx } from "./types";

/** Up to two uppercase initials from a name (fallback for a missing avatar). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}

/**
 * Editor placeholder for a bound block. resolve() is server-only, so the admin
 * canvas can only draw the real block design when its data was pre-resolved on
 * the server and handed in as `content._resolved` (see the page-edit route's
 * `resolveBoundBlocks`). When `resolved` is present (defined — even an empty
 * array meaning "resolved, no data yet") we return null so the block's own
 * Render draws its real design; when it's `undefined` (a block freshly added in
 * the client, which never went through the server), we show the quiet label.
 *
 * On the public site `ctx.mode` is "public" and this always returns null.
 */
export function boundPlaceholder(ctx: RenderCtx, label: string, resolved?: unknown) {
  if (ctx.mode !== "editor") return null;
  if (resolved !== undefined) return null;
  return {
    style: {
      border: "1px dashed var(--border)",
      borderRadius: "var(--radius-md)",
      padding: "var(--space-6)",
      color: "var(--text-faint)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-2xs)",
      textTransform: "uppercase" as const,
      letterSpacing: "var(--tracking-wide)",
    },
    label,
  };
}
