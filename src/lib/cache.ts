import { revalidateTag } from "next/cache";

/**
 * Cache-tag conventions for ISR + on-demand revalidation. Public content pages are statically
 * generated and tag their data reads; admin content writes call revalidateContent() to expire
 * exactly the affected tags, so an edit shows up immediately without making every page dynamic.
 *
 * Next 16 note: revalidateTag now takes a cacheLife profile as a required 2nd arg ('max' =
 * serve-stale-then-revalidate). The single-arg form is deprecated.
 */

/** All content-entry reads (lists + details). */
export const TAG_CONTENT = "content";
/** A specific content type's entries, e.g. content:project. Lets an edit to one type avoid
 * busting unrelated pages. */
export const tagForType = (typeSlug: string) => `content:${typeSlug}`;
/** Site settings (brand/theme/features) — busted when /admin/settings saves. */
export const TAG_SETTINGS = "settings";

/** Revalidate content pages after a create/update/delete. Passing a typeSlug additionally busts
 * that type's tag; always busts the broad content tag so lists refresh. */
export function revalidateContent(typeSlug?: string): void {
  revalidateTag(TAG_CONTENT, "max");
  if (typeSlug) revalidateTag(tagForType(typeSlug), "max");
}

/** Revalidate everything that depends on site settings (layout, metadata, feature-gated UI). */
export function revalidateSettings(): void {
  revalidateTag(TAG_SETTINGS, "max");
}
